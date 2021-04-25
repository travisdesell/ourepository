"""
Split up a large mosaic into overlapping slices to be used as part of a machine learning pipeline. Create TFRecords
for training and testing using these slices. Only slices that contain annotations are used for training and evaluation.

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

os.environ['TF_CPP_MIN_LOG_LEVEL'] = '2'  # suppress TensorFlow logging

import pandas as pd
from object_detection.utils import label_map_util
from tqdm import tqdm

import tensorflow as tf

from scripts.util.file_utils import create_directory_if_not_exists, get_labels_from_csvs, full_path, load_mosaic, \
    get_image_window
from scripts.util.make_proto import create_label_proto
from scripts.util.slice_utils import generate_slice_coords_with_annotations, transform

from scripts.preprocessing.generate_tfrecord import create_tf_example
from scripts.util.visualization_utils import show_bounding_boxes

from scripts import ROOT_DIR

logger = logging.getLogger(__name__)


def create_train_test_split(train_test_ratio, slice_coords_dict):
    """
    Determine which slices are used for training and which for evaluation.

    :param train_test_ratio: the ratio of train records to test record
    :param slice_coords_dict: a dict whose keys are the (x, y) coordinates of the top left of each slice
    :return: a dict where the key is the (x, y) for the slice, and the value is a boolean indicating whether this
        slice is part of the train split
    """

    # get the list of slice coordinates and randomly shuffle them
    coords_list = list(slice_coords_dict.keys())
    random.shuffle(coords_list)

    in_train_split = dict()

    # find the index of the list that corresponds to the ratio
    first_half = int(len(coords_list) * train_test_ratio)

    # all slices to the left will be in the train split
    for coord in coords_list[:first_half]:
        in_train_split[coord] = True
    # the rest of the slices will be in the test split
    for coord in coords_list[first_half:]:
        in_train_split[coord] = False

    # the dict mapping slices to whether they are in the train or test split
    return in_train_split


def setup(name, data_dir, model_width, model_height, stride_length):
    """
    Create directories for annotation output that will be used for TensorFlow.
    Gather all the annotation labels and create a label map for them.
    Gather all the annotations and determine which slices contain each.

    :param name: a name that uniquely identifies this mosaic and training data
    :param data_dir: directory containing mosaic and CSVs to train on
    :param model_width: the width of the input to the model
    :param model_height: the height of the input to the model
    :param stride_length: how far to move sliding window for each slice
    :return: a dict mapping slice coordinates to the annotations contained within them, the mosaic DatasetReader,
        the generated label map, the path to the train TFRecord, and the path to the test TFRecord
    """

    # directory containing all annotations
    annotations_dir = os.path.join(ROOT_DIR, 'annotations')
    create_directory_if_not_exists(annotations_dir)

    # path to directory containing annotations for this mosaic
    mosaic_annotations_dir = os.path.join(annotations_dir, name)
    create_directory_if_not_exists(mosaic_annotations_dir)

    # determine paths to train and test TFRecords
    train_output_path = os.path.join(mosaic_annotations_dir, 'train.record')
    test_output_path = os.path.join(mosaic_annotations_dir, 'test.record')

    # check to make sure data directory has at least one folder
    if len(os.listdir(data_dir)) == 0:
        logger.error('Data directory must contain at least one mosaic directory')
        sys.exit(1)

    # check to make sure data directory only contains folders
    for mosaic_dir_name in os.listdir(data_dir):
        mosaic_dir = os.path.join(data_dir, mosaic_dir_name)
        if os.path.isdir(mosaic_dir):
            # check to make sure mosaic directory only contains files
            for mosaic_file_name in os.listdir(mosaic_dir):
                if not os.path.isfile(os.path.join(mosaic_dir, mosaic_file_name)):
                    logger.error('Directory found in mosaic directory')
                    logger.error('Only files allowed in mosaic directory')
                    sys.exit(1)
        else:
            logger.error('File found in data directory')
            logger.error('Only directories allowed in data directory')
            sys.exit(1)

    # iterate over all mosaics
    label_names = set()
    slice_coords_dicts = list()
    mosaic_datasets = list()
    for mosaic_dir_name in os.listdir(data_dir):
        mosaic_dir = os.path.join(data_dir, mosaic_dir_name)

        # get image filename; should be one image file in directory
        valid_images = ('.jpg', '.jpeg', '.tif', '.tiff')
        image_paths = [f for f in os.listdir(mosaic_dir) if f.lower().endswith(valid_images)]
        if len(image_paths) == 0:
            logger.error(f'No image found in mosaic directory: {full_path(mosaic_dir)}')
            sys.exit(1)
        if len(image_paths) > 1:
            logger.error('Ambiguous image file')
            logger.error(f'Only one image file allowed in mosaic directory: {full_path(mosaic_dir)}')
            sys.exit(1)
        image_path = os.path.join(mosaic_dir, image_paths[0])

        # get CSV filenames from directory
        csv_filenames = [f for f in os.listdir(mosaic_dir) if f.lower().endswith('.csv')]
        if len(csv_filenames) == 0:
            logger.error('No CSVs found in directory')
            sys.exit(1)
        csv_filenames = [os.path.join(mosaic_dir, filename) for filename in csv_filenames]

        # gather all the label names from the CSVs
        csv_filename_to_label = get_labels_from_csvs(csv_filenames)
        label_names = label_names.union(set(csv_filename_to_label.values()))

        # load in mosaic
        mosaic_dataset, mosaic_width, mosaic_height = load_mosaic(image_path)
        mosaic_datasets.append(mosaic_dataset)

        # iterate over each label CSV and add annotations to dataframe
        annotations_df_list = list()
        for csv_filename in csv_filenames:
            # create dataframe containing annotation data
            df = pd.read_csv(csv_filename, comment='#')
            df['label'] = csv_filename_to_label[csv_filename]
            annotations_df_list.append(df)
        total_annotations_df = pd.concat(annotations_df_list)

        # generate dict mapping slice coordinates to a list of the annotations contained within the slice
        slice_coords_dict = generate_slice_coords_with_annotations(
            mosaic_width, mosaic_height, model_width, model_height, stride_length, total_annotations_df)

        # TODO possibly keep some slices without annotations
        # remove all slices without an annotation (performed here to make progress bar more accurate)
        slice_coords_dict_all = slice_coords_dict
        slice_coords_dict = {coord: annotations for (coord, annotations) in slice_coords_dict.items() if
                             len(annotations) > 0}
        slice_coords_dicts.append(slice_coords_dict)
        percent_containing_annotations = 100 * len(slice_coords_dict) / len(slice_coords_dict_all)
        logger.info(f'{round(percent_containing_annotations, 2)}% of all slices in mosaic contain annotations')

    # create label map
    sorted_label_names_list = sorted([label_name.lower() for label_name in list(label_names)])
    label_map_path = create_label_proto(sorted_label_names_list, mosaic_annotations_dir)

    # load label map
    label_map = label_map_util.load_labelmap(label_map_path)

    return slice_coords_dicts, mosaic_datasets, label_map, train_output_path, test_output_path


def make_slices(slice_coords_dicts, mosaic_datasets, label_map, model_input_width, model_input_height,
                train_test_ratio, train_output_path, test_output_path):
    """
    Slice up the mosaic, then create TFRecords for training and evaluation from these slices.

    :param slice_coords_dicts: a list of dicts where the key is the (x, y) for top left of the slice, and the value
        is a list of 5-tuples containing (x1, y1, x2, y2, label) for each annotation in the slice
    :param mosaic_datasets: a list of mosaic DatasetReaders
    :param label_map: the label map object containing information about annotation classes
    :param model_input_width: the width of the input to the model
    :param model_input_height: the height of the input to the model
    :param train_test_ratio: the train/test split ratio
    :param train_output_path: the path to the train TFRecord
    :param test_output_path: the path to the test TFRecord
    :return: none
    """

    # open writers for the train and test TFRecords
    train_writer = tf.io.TFRecordWriter(train_output_path)
    test_writer = tf.io.TFRecordWriter(test_output_path)

    # iterate over all mosaics
    for slice_coords_dict, mosaic_dataset in zip(slice_coords_dicts, mosaic_datasets):
        # create train/test split
        in_train_split = create_train_test_split(train_test_ratio, slice_coords_dict)

        # loop over slices
        logger.info(f'Creating slices and TFExamples for {full_path(mosaic_dataset.name)}')
        time.sleep(0.1)
        for coord in tqdm(slice_coords_dict):
            # get the annotations fully contained within this slice
            annotations = slice_coords_dict[coord]
            # top left corner for this slice
            x, y = coord

            # get the PIL image for this slice
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

            # create the TF Example
            # only apply transformation if this is a training slice
            if in_train_split[coord]:
                # transform the slice image and its annotations; may not apply transformation - see function for details
                transformed_image, transformed_annotations = transform(image, rel_annotations)

                # uncomment to show image along with annotations
                # show_bounding_boxes(image, rel_annotations)
                # show_bounding_boxes(transformed_image, transformed_annotations)

                tf_example = create_tf_example(transformed_annotations, transformed_image, label_map)
                train_writer.write(tf_example.SerializeToString())
            else:
                tf_example = create_tf_example(rel_annotations, image, label_map)
                test_writer.write(tf_example.SerializeToString())

    # close resources
    train_writer.close()
    logger.info('Successfully created the TFRecord file: {}'.format(full_path(train_output_path)))
    test_writer.close()
    logger.info('Successfully created the TFRecord file: {}'.format(full_path(test_output_path)))


def main(name, data_dir, model_width, model_height, stride_length, ratio):
    """
    Set up annotation-related directories. Process the annotations.
    Slice up the mosaic, then create TFRecords for training and evaluation from these slices.

    :param name: a name that uniquely identifies this mosaic and training data
    :param data_dir: directory containing mosaic and CSVs to train on
    :param model_width: the width of the input to the model
    :param model_height: the height of the input to the model
    :param stride_length: how far to move sliding window for each slice
    :param ratio: the train/test split ratio
    :return: none
    """

    # directory setup and annotation preprocessing
    slice_coords_dicts, mosaic_datasets, label_map, train_output_path, test_output_path = \
        setup(name, data_dir, model_width, model_height, stride_length)

    # slice up the image and create the TFRecords
    make_slices(slice_coords_dicts, mosaic_datasets, label_map, model_width, model_height,
                ratio, train_output_path, test_output_path)

    # close resources
    for mosaic_dataset in mosaic_datasets:
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
