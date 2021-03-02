"""
Run inference on a mosaic.

usage: inference.py [-h] [-n NAME] [-i IMAGE_PATH] [-m MODEL_NAME]
                    [-w MODEL_WIDTH] [--model_height MODEL_HEIGHT]
                    [-s STRIDE_LENGTH]

optional arguments:
  -h, --help            show this help message and exit
  -n NAME, --name NAME  a name that uniquely identifies the mosaic that the
                        model was trained on
  -i IMAGE_PATH, --image_path IMAGE_PATH
                        the path to the image to run the inference on
  -m MODEL_NAME, --model_name MODEL_NAME
                        the name of the pretrained model from the TF Object
                        Detection model zoo
  -w MODEL_WIDTH, --model_width MODEL_WIDTH
                        the width of the input to the model
  --model_height MODEL_HEIGHT
                        the height of the input to the model
  -s STRIDE_LENGTH, --stride_length STRIDE_LENGTH
                        how far to move sliding window for each slice
"""

__author__ = 'Ian Randman'

import argparse
import logging
import os
import warnings

from tqdm import tqdm

from scripts.evaluation.model_inference import load_from_saved_model, inference
from scripts.util.mosaic_utils import load_mosaic, get_image_window
from scripts.util.slice import generate_slice_coords

# Python doesn't like me importing rasterio before tensorflow, so this goes down here
import rasterio as rio

logger = logging.getLogger(__name__)
warnings.filterwarnings("ignore", category=rio.errors.NotGeoreferencedWarning)


def main(name, image_path, model_name, model_width, model_height, stride_length):

    assert model_width == model_height  # TODO necessary?

    # load the mosaic
    mosaic_dataset, mosaic_width, mosaic_height = load_mosaic(image_path)

    # get the top left corner coordinate for each slice to inference on
    slice_coords_list = generate_slice_coords(mosaic_width, mosaic_height, model_width, model_width, stride_length)

    # load the model
    detect_fn, category_index = load_from_saved_model(name, model_name)

    # iterate over all slices
    logger.info('Performing inference on full image...')
    for coord in tqdm(slice_coords_list):
        x, y = coord  # top left corner for this slice

        # get the image of this slice
        image = get_image_window(mosaic_dataset, x, y, model_width, model_height)

        # TODO don't plot, gather annotations, merge inferences for all slices
        # inference on this slice
        inference(image, detect_fn, category_index)

    # close resources
    mosaic_dataset.close()


if __name__ == '__main__':
    parser = argparse.ArgumentParser()
    parser.add_argument('-n',
                        '--name',
                        help='a name that uniquely identifies the mosaic that the model was trained on',
                        type=str,
                        default='test')  # TODO must be changed to account for user/project
    parser.add_argument('-i',
                        '--image_path',
                        help='the path to the image to run the inference on',
                        type=str,
                        default=os.path.join(os.path.dirname(__file__), '../../test/test/test.png'))
    parser.add_argument('-m',
                        '--model_name',
                        help='the name of the pretrained model from the TF Object Detection model zoo',
                        type=str,
                        default='faster_rcnn_resnet50_v1_640x640_coco17_tpu-8')
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
                        default=640)

    args = parser.parse_args()

    main(args.name, args.image_path, args.model_name, args.model_width, args.model_height, args.stride_length)
