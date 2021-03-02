"""
Split up a large mosaic into overlapping slices to be used as part of a machine learning pipeline. Create TFRecords
for training and testing using these slices.

usage: crop.py [-H] [-n NAME] [-d DATA_DIR] [-w MODEL_WIDTH] [-h MODEL_HEIGHT]
               [-s STRIDE_LENGTH] [-r RATIO]

optional arguments:
  -H, --help            show this help message and exit
  -n NAME, --name NAME  a name that uniquely identifies this mosaic and
                        training data
  -d DATA_DIR, --data_dir DATA_DIR
                        directory containing mosaic and CSVs to train on
  -w MODEL_WIDTH, --model_width MODEL_WIDTH
                        the width of the input to the model
  -h MODEL_HEIGHT, --model_height MODEL_HEIGHT
                        the height of the input to the model
  -s STRIDE_LENGTH, --stride_length STRIDE_LENGTH
                        how far to move sliding window for each slice
  -r RATIO, --ratio RATIO
                        the train/test split ratio
"""

__author__ = 'Ian Randman, John McCarroll'

import argparse
import os
import random
import sys
import time
import logging

import pandas as pd
from object_detection.utils import label_map_util
from tqdm import tqdm

import tensorflow.compat.v1 as tf

from scripts.util.file_utils import create_directory_if_not_exists, get_labels_from_csvs
from scripts.util.make_proto import create_label_proto
from scripts.util.mosaic_utils import load_mosaic, get_image_window
from scripts.util.slice_utils import generate_slice_coords_with_annotations, transform

from generate_tfrecord import create_tf_example
from scripts.util.visualization_utils import show_bounding_boxes

logger = logging.getLogger(__name__)


def create_train_test_split(train_test_ratio, slice_coords_dict):
    in_train_split = dict()
    coords_list = list(slice_coords_dict.keys())
    random.shuffle(coords_list)
    first_half = int(len(coords_list) * train_test_ratio)
    for coord in coords_list[:first_half]:
        in_train_split[coord] = True
    for coord in coords_list[first_half:]:
        in_train_split[coord] = False

    return in_train_split


def setup(name, data_dir, model_width, model_height, stride_length):

    # annotations
    annotations_dir = os.path.join(os.path.dirname(__file__), '../../annotations')
    create_directory_if_not_exists(annotations_dir)

    # path to directory containing annotations for this mosaic
    mosaic_annotations_dir = os.path.join(annotations_dir, name)
    create_directory_if_not_exists(mosaic_annotations_dir)

    train_output_path = os.path.join(mosaic_annotations_dir, 'train.record')
    test_output_path = os.path.join(mosaic_annotations_dir, 'test.record')

    # get image filename
    valid_images = ('.jpg', '.jpeg', '.png', '.tif')
    image_filenames = [f for f in os.listdir(data_dir) if f.lower().endswith(valid_images)]
    if len(image_filenames) == 0:
        logger.error('No image found in directory')
        sys.exit(1)
    if len(image_filenames) > 1:
        logger.error('Ambiguous image file')
        logger.error('Only one image file allowed in directory')
        sys.exit(1)
    image_filename = os.path.join(data_dir, image_filenames[0])

    # get CSV filenames
    csv_filenames = [f for f in os.listdir(data_dir) if f.lower().endswith('.csv')]
    if len(csv_filenames) == 0:
        logger.error('No CSVs found in directory')
        sys.exit(1)
    csv_filenames = [os.path.join(data_dir, filename) for filename in csv_filenames]

    csv_filename_to_label = get_labels_from_csvs(csv_filenames)

    # create label map
    label_map_path = create_label_proto(list(csv_filename_to_label.values()), mosaic_annotations_dir)

    # load label map
    label_map = label_map_util.load_labelmap(label_map_path)

    # load in mosaic
    mosaic_dataset, mosaic_width, mosaic_height = load_mosaic(image_filename)

    annotations_df_list = list()
    for csv_filename in csv_filenames:
        # create dataframe containing annotation data
        df = pd.read_csv(csv_filename, comment='#')
        df['label'] = csv_filename_to_label[csv_filename]
        annotations_df_list.append(df)
    total_annotations_df = pd.concat(annotations_df_list)

    slice_coords_dict = generate_slice_coords_with_annotations(
        mosaic_width, mosaic_height, model_width, model_height, stride_length, total_annotations_df)

    # TODO remove (maybe)
    # remove all slices without an annotation (performed here to make progress bar more accurate)
    slice_coords_dict_all = slice_coords_dict
    slice_coords_dict = {coord: annotations for (coord, annotations) in slice_coords_dict.items() if
                         len(annotations) > 0}
    percent_containing_annotations = 100 * len(slice_coords_dict) / len(slice_coords_dict_all)
    logger.info(f'{round(percent_containing_annotations, 2)}% of all slices contain annotations')

    return slice_coords_dict, mosaic_dataset, label_map, train_output_path, test_output_path


def make_slices(slice_coords_dict, mosaic_dataset, label_map, model_input_width, model_input_height,
                train_test_ratio, train_output_path, test_output_path):

    # open writers for the train and test TFRecords
    train_writer = tf.python_io.TFRecordWriter(train_output_path)
    test_writer = tf.python_io.TFRecordWriter(test_output_path)

    # create train/test split
    in_train_split = create_train_test_split(train_test_ratio, slice_coords_dict)

    # loop over slices
    logger.info('Creating slices and TFExamples')
    time.sleep(0.1)
    for coord in tqdm(slice_coords_dict):
        annotations = slice_coords_dict[coord]  # annotations for this slice
        x, y = coord  # top left corner for this slice

        image = get_image_window(mosaic_dataset, x, y, model_input_width, model_input_height)

        # iterate over all annotations in slice
        rel_annotations = list()
        for x1, y1, x2, y2, label in annotations:
            # calculate relative normalized coordinates for annotation in slice
            rel_x1 = (x1 - x) / model_input_width
            rel_y1 = (y1 - y) / model_input_height
            rel_x2 = (x2 - x) / model_input_width
            rel_y2 = (y2 - y) / model_input_height

            rel_annotations.append((rel_x1, rel_y1, rel_x2, rel_y2, label))

        # create the TFExample
        # only apply transformation if this is a training slice
        if in_train_split[coord]:
            transformed_image, transformed_annotations = transform(image, rel_annotations)
            tf_example = create_tf_example(transformed_annotations, transformed_image, label_map)
            train_writer.write(tf_example.SerializeToString())
        else:
            tf_example = create_tf_example(rel_annotations, image, label_map)
            test_writer.write(tf_example.SerializeToString())

        # uncomment to show image along with annotations
        # show_bounding_boxes(transformed_image, transformed_annotations)
        # show_bounding_boxes(image, rel_annotations)

    # close resources
    train_writer.close()
    logger.info('Successfully created the TFRecord file: {}'.format(train_output_path))
    test_writer.close()
    logger.info('Successfully created the TFRecord file: {}'.format(test_output_path))


def main(name, data_dir, model_width, model_height, stride_length, ratio):
    slice_coords_dict, mosaic_dataset, label_map, train_output_path, test_output_path = \
        setup(name, data_dir, model_width, model_height, stride_length)

    make_slices(slice_coords_dict, mosaic_dataset, label_map, model_width, model_height,
                ratio, train_output_path, test_output_path)

    # close resources
    mosaic_dataset.close()


if __name__ == '__main__':
    parser = argparse.ArgumentParser(add_help=False)
    parser.add_argument('-H', '--help', action='help',
                        help='show this help message and exit')
    parser.add_argument('-n',
                        '--name',
                        help='a name that uniquely identifies this mosaic and training data',
                        type=str,
                        default='test')  # TODO must be changed to account for user/project
    parser.add_argument('-d',
                        '--data_dir',
                        help='directory containing mosaic and CSVs to train on',
                        type=str,
                        default=os.path.join(os.path.dirname(__file__), '../../test/test'))
    parser.add_argument('-w',
                        '--model_width',
                        help='the width of the input to the model',
                        type=int,
                        default=640)
    parser.add_argument('-h',
                        '--model_height',
                        help='the height of the input to the model',
                        type=int,
                        default=640)
    parser.add_argument('-s',
                        '--stride_length',
                        help='how far to move sliding window for each slice',
                        type=int,
                        default=64)
    parser.add_argument('-r',
                        '--ratio',
                        help='the train/test split ratio',
                        type=float,
                        default=0.9)

    args = parser.parse_args()

    main(args.name, args.data_dir, args.model_width, args.model_height, args.stride_length, args.ratio)
