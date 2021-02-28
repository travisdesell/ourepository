__author__ = 'Ian Randman'

import logging
import warnings

import rasterio as rio
import numpy as np
from PIL import Image
from rasterio.windows import Window

warnings.filterwarnings("ignore", category=rio.errors.NotGeoreferencedWarning)

logger = logging.getLogger(__name__)


def load_mosaic(image_filename):
    # load in mosaic
    mosaic_dataset = rio.open(image_filename)

    # display attrs
    logger.info('START MOSAIC DETAILS')
    logger.info('Number of bands:')
    logger.info(mosaic_dataset.count)

    logger.info('Mosaic width and height:')
    mosaic_width = mosaic_dataset.width
    mosaic_height = mosaic_dataset.height
    logger.info(mosaic_width)
    logger.info(mosaic_height)
    logger.info('END MOSAIC DETAILS')

    return mosaic_dataset, mosaic_width, mosaic_height


def get_image_window(mosaic_dataset, x, y, model_input_width, model_input_height):
    # read band slices using Window views
    sample_red = mosaic_dataset.read(1, window=Window(x, y, model_input_width, model_input_height))
    sample_green = mosaic_dataset.read(2, window=Window(x, y, model_input_width, model_input_height))
    sample_blue = mosaic_dataset.read(3, window=Window(x, y, model_input_width, model_input_height))
    sample_alpha = mosaic_dataset.read(4, window=Window(x, y, model_input_width, model_input_height))

    # add new axis for RGBA values
    sample_red = sample_red[:, :, np.newaxis]
    sample_green = sample_green[:, :, np.newaxis]
    sample_blue = sample_blue[:, :, np.newaxis]
    sample_alpha = sample_alpha[:, :, np.newaxis]

    # concatenate bands along new RGBA axis
    sample = np.concatenate([sample_red, sample_green, sample_blue, sample_alpha], axis=2)

    # create image
    image = Image.fromarray(sample, mode='RGBA')

    return image
