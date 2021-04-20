"""
Provides some utilities relating to files.
Includes converting a path to its full path (from relative), creating a directory if it does not yet exist,
and collecting a set of labels from annotation CSVs.
Also includes loading mosaics and getting a window from a mosaic.
"""

__author__ = 'Ian Randman, John McCarroll'

import logging
import os
import sys
import warnings

import numpy as np
import rasterio as rio
from PIL import Image
from rasterio.windows import Window

logger = logging.getLogger(__name__)
warnings.filterwarnings("ignore", category=rio.errors.NotGeoreferencedWarning)


def full_path(path):
    """
    Convert a filesystem path to its full path. This will resolve and '..' in the path.

    :param path: the path to convert
    :return: the fully qualified path
    """

    return os.path.abspath(path)


def create_directory_if_not_exists(dir_name):
    """
    If a directory does not exist, create it.

    :param dir_name: the name of the directory
    :return: none
    """

    if not os.path.exists(dir_name):
        os.mkdir(dir_name)
        logger.info(f'Created {full_path(dir_name)}')


def get_labels_from_csvs(csv_filenames):
    """
    CSV files containing annotations will start with comments, where each comment line starts with a '#'.
    One of these comments indicates the label that the following bounding boxes are for.
    This function collects the labels from a set of those files.

    :param csv_filenames: the names of the CSV files
    :return: a dict where the CSV filename is the key, and its label is the value
    """

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

    return csv_filename_to_label


def load_mosaic(image_path):
    """
    Load a mosaic into a dataset. This does not store the entire image in memory.

    :param image_path: the path to the mosaic
    :return: the mosaic DatasetReader, its width, and its height
    """

    # load in mosaic
    mosaic_dataset = rio.open(image_path)

    # display attrs
    logger.info('START MOSAIC DETAILS')
    logger.info('Number of bands:')
    logger.info(mosaic_dataset.count)

    # get width and height
    logger.info('Mosaic width and height:')
    mosaic_width = mosaic_dataset.width
    mosaic_height = mosaic_dataset.height
    logger.info(mosaic_width)
    logger.info(mosaic_height)
    logger.info('END MOSAIC DETAILS')

    # return the mosaic as a DatasetReader, its width, and its height
    return mosaic_dataset, mosaic_width, mosaic_height


def get_image_window(mosaic_dataset, x, y, window_width, window_height):
    """
    Get a window into a mosaic as a PIL image.

    :param mosaic_dataset: the mosaic DatasetReader
    :param x: the x coordinate of the top left of the window
    :param y: the y coordinate of the top left of the window
    :param window_width: the width of the window
    :param window_height: the height of the window
    :return: the PIL image of the window
    """

    # read band slices using Window views
    sample_red = mosaic_dataset.read(1, window=Window(x, y, window_width, window_height))
    sample_green = mosaic_dataset.read(2, window=Window(x, y, window_width, window_height))
    sample_blue = mosaic_dataset.read(3, window=Window(x, y, window_width, window_height))
    sample_alpha = mosaic_dataset.read(4, window=Window(x, y, window_width, window_height))

    # add new axis for RGBA values
    sample_red = sample_red[:, :, np.newaxis]
    sample_green = sample_green[:, :, np.newaxis]
    sample_blue = sample_blue[:, :, np.newaxis]
    sample_alpha = sample_alpha[:, :, np.newaxis]

    # concatenate bands along new RGBA axis
    sample = np.concatenate([sample_red, sample_green, sample_blue, sample_alpha], axis=2)

    # create image as RGBA
    image = Image.fromarray(sample, mode='RGBA')

    # return the PIL image
    return image
