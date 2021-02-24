"""
Split up a large mosaic into overlapping slices to be used as part of a machine learning pipeline. Create TFRecords
for training and testing using these slices.
"""

__author__ = 'Ian Randman, John McCarroll'

import argparse
import random
import time
import logging
import warnings

from PIL import Image
import numpy as np
import csv
import pandas as pd
import cv2
import os
import click
import sys
from object_detection.utils import label_map_util
from tqdm import tqdm

from scripts.util.download_model import download_and_unpack_model
from scripts.util.make_proto import create_label_proto

import tensorflow.compat.v1 as tf
from generate_tfrecord import create_tf_example_new

import rasterio as rio
from rasterio.windows import Window

from scripts.util.slice import generate_slice_coords

logger = logging.getLogger(__name__)
warnings.filterwarnings("ignore", category=rio.errors.NotGeoreferencedWarning)


if __name__ == '__main__':
    parser = argparse.ArgumentParser()
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
    parser.add_argument('--model_height',
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

    # TODO do not group by mosaic name
    # a name that uniquely identifies this mosaic and training data
    NAME = args.name

    # directory containing mosaic and CSVs to train on
    DATA_DIR = args.data_dir

    # training Specs

    # model input width and height
    MODEL_INPUT_WIDTH = args.model_width  # TODO must this be same as model? I don't think so, but it probably mitigates effects of distortion.
    MODEL_INPUT_HEIGHT = args.model_height

    # how far to move sliding window for each slice
    STRIDE_LENGTH = args.stride_length

    # the train/test split ratio
    TRAIN_TEST_RATIO = args.ratio

    # annotations
    ANNOTATIONS_DIR = os.path.join(os.path.dirname(__file__), '../../annotations')
    if not os.path.exists(ANNOTATIONS_DIR):
        os.mkdir(ANNOTATIONS_DIR)
        logger.info(f'Created {ANNOTATIONS_DIR}')

    # path to directory containing annotations for this mosaic
    MOSAIC_ANNOTATIONS_DIR = os.path.join(ANNOTATIONS_DIR, NAME)
    if not os.path.exists(MOSAIC_ANNOTATIONS_DIR):
        os.mkdir(MOSAIC_ANNOTATIONS_DIR)
        logger.info(f'Created {MOSAIC_ANNOTATIONS_DIR}')

    TRAIN_OUTPUT_PATH = os.path.join(MOSAIC_ANNOTATIONS_DIR, 'train.record')
    TEST_OUTPUT_PATH = os.path.join(MOSAIC_ANNOTATIONS_DIR, 'test.record')

    # get image filename
    valid_images = ('.jpg', '.jpeg', '.png', '.tif')
    image_filenames = [f for f in os.listdir(DATA_DIR) if f.lower().endswith(valid_images)]
    if len(image_filenames) == 0:
        logger.error('No image found in directory')
        sys.exit(1)
    if len(image_filenames) > 1:
        logger.error('Ambiguous image file')
        logger.error('Only one image file allowed in directory')
        sys.exit(1)
    IMAGE_FILENAME = os.path.join(DATA_DIR, image_filenames[0])

    # get CSV filenames
    csv_filenames = [f for f in os.listdir(DATA_DIR) if f.lower().endswith('.csv')]
    if len(csv_filenames) == 0:
        logger.error('No CSVs found in directory')
        sys.exit(1)
    csv_filenames = [os.path.join(DATA_DIR, filename) for filename in csv_filenames]

    # get labels from CSVs
    csv_filename_to_label = dict()
    for csv_filename in csv_filenames:
        with open(csv_filename) as f:
            label = ''
            line = f.readline()
            while line and line.startswith('#'):
                if line.lower().startswith('#label:'):
                    label = line.split(':')[-1].strip()
                    break
                line = f.readline()
            if label == '':
                logger.error(f'Cannot find label comment in {csv_filename}')
                sys.exit(1)
            csv_filename_to_label[csv_filename] = label

    # create label map
    LABEL_MAP_PATH = create_label_proto(list(csv_filename_to_label.values()), MOSAIC_ANNOTATIONS_DIR)

    # load label map
    label_map = label_map_util.load_labelmap(LABEL_MAP_PATH)

    # load in mosaic
    mosaic_dataset = rio.open(IMAGE_FILENAME)

    # display attrs
    logger.info('START MOSAIC DETAILS')
    logger.info('Number of bands:')
    logger.info(mosaic_dataset.count)

    logger.info('Mosaic width and height:')
    MOSAIC_WIDTH = mosaic_dataset.width
    MOSAIC_HEIGHT = mosaic_dataset.height
    logger.info(MOSAIC_WIDTH)
    logger.info(MOSAIC_HEIGHT)
    logger.info('END MOSAIC DETAILS')

    annotations_df_list = list()
    for csv_filename in csv_filenames:
        # create dataframe containing annotation data
        df = pd.read_csv(csv_filename, comment='#')
        df['label'] = csv_filename_to_label[csv_filename]
        annotations_df_list.append(df)
    total_annotations_df = pd.concat(annotations_df_list)

    slice_coords_dict = generate_slice_coords(MOSAIC_WIDTH, MOSAIC_HEIGHT, MODEL_INPUT_WIDTH, MODEL_INPUT_WIDTH,
                                              STRIDE_LENGTH, total_annotations_df)

    # TODO remove (maybe)
    # remove all slices without an annotation (performed here to make progress bar more accurate)
    slice_coords_dict_all = slice_coords_dict
    slice_coords_dict = {coord: annotations for (coord, annotations) in slice_coords_dict.items() if
                         len(annotations) > 0}
    percent_containing_annotations = 100 * len(slice_coords_dict) / len(slice_coords_dict_all)
    logger.info(f'{round(percent_containing_annotations, 2)}% of all slices contain annotations')

    # create train/test split
    in_train_split = dict()
    coords_list = list(slice_coords_dict.keys())
    random.shuffle(coords_list)
    first_half = int(len(coords_list) * TRAIN_TEST_RATIO)
    for coord in coords_list[:first_half]:
        in_train_split[coord] = True
    for coord in coords_list[first_half:]:
        in_train_split[coord] = False

    # open writers for the train and test TFRecords
    train_writer = tf.python_io.TFRecordWriter(TRAIN_OUTPUT_PATH)
    test_writer = tf.python_io.TFRecordWriter(TEST_OUTPUT_PATH)

    # loop over slices
    # for coord in slice_coords_dict: TODO maybe put back
    logger.info('Creating slices and TFExamples')
    time.sleep(0.1)
    for coord in tqdm(slice_coords_dict):
        annotations = slice_coords_dict[coord]  # annotations for this slice
        x, y = coord  # top left corner for this slice

        # read band slices using Window views
        sample_red = mosaic_dataset.read(1, window=Window(x, y, MODEL_INPUT_WIDTH, MODEL_INPUT_HEIGHT))
        sample_green = mosaic_dataset.read(2, window=Window(x, y, MODEL_INPUT_WIDTH, MODEL_INPUT_HEIGHT))
        sample_blue = mosaic_dataset.read(3, window=Window(x, y, MODEL_INPUT_WIDTH, MODEL_INPUT_HEIGHT))
        sample_alpha = mosaic_dataset.read(4, window=Window(x, y, MODEL_INPUT_WIDTH, MODEL_INPUT_HEIGHT))

        # add new axis for RGBA values
        sample_red = sample_red[:, :, np.newaxis]
        sample_green = sample_green[:, :, np.newaxis]
        sample_blue = sample_blue[:, :, np.newaxis]
        sample_alpha = sample_alpha[:, :, np.newaxis]

        # concatenate bands along new RGBA axis
        sample = np.concatenate([sample_red, sample_green, sample_blue, sample_alpha], axis=2)

        # create image
        image = Image.fromarray(sample, mode='RGBA')  # create image

        # iterate over all annotations in slice
        rel_annotations = list()
        for x1, y1, x2, y2, label in annotations:
            # calculate relative coordinates for annotation in slice
            rel_x1 = x1 - x
            rel_y1 = y1 - y
            rel_x2 = x2 - x
            rel_y2 = y2 - y

            rel_annotations.append((rel_x1, rel_y1, rel_x2, rel_y2, label))

        # create the TFExample
        tf_example = create_tf_example_new(rel_annotations, image, label_map)
        if in_train_split[coord]:
            train_writer.write(tf_example.SerializeToString())
        else:
            test_writer.write(tf_example.SerializeToString())

    # close resources
    train_writer.close()
    logger.info('Successfully created the TFRecord file: {}'.format(TRAIN_OUTPUT_PATH))
    test_writer.close()
    logger.info('Successfully created the TFRecord file: {}'.format(TEST_OUTPUT_PATH))

    mosaic_dataset.close()
