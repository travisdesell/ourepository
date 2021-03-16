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

import numpy as np
from PIL import Image
from tqdm import tqdm

from scripts.evaluation.model_inference import load_from_saved_model, inference
from scripts.util.file_utils import create_directory_if_not_exists, full_path
from scripts.util.mosaic_utils import load_mosaic, get_image_window
from scripts.util.slice_utils import generate_slice_coords

# Python doesn't like me importing rasterio before tensorflow, so this goes down here
import rasterio as rio

from scripts.util.visualization_utils import place_detections_on_image

logger = logging.getLogger(__name__)
warnings.filterwarnings("ignore", category=rio.errors.NotGeoreferencedWarning)


def denormalize_detections(detections, width, height):
    # create function to denormalize each set of coordinates
    func = lambda a: np.array([a[0] * height, a[1] * width, a[2] * height, a[3] * width])

    round_func = np.vectorize(round)

    # apply function
    detections['detection_boxes'] = round_func(np.array(list(map(func, detections['detection_boxes']))))


def convert_relative_detections_to_absolute(detections, x, y):
    # create function to convert each set of relative coordinates absolute
    func = lambda a: np.array([a[0] + y, a[1] + x, a[2] + y, a[3] + x])

    # apply function
    detections['detection_boxes'] = np.array(list(map(func, detections['detection_boxes'])))


def append_detection(all_detections, detections):
    if not all_detections:
        all_detections = detections
    else:
        all_detections['detection_boxes'] = np.append(all_detections['detection_boxes'], detections['detection_boxes'], axis=0)
        all_detections['detection_anchor_indices'] = np.append(all_detections['detection_anchor_indices'], detections['detection_anchor_indices'], axis=0)
        all_detections['detection_classes'] = np.append(all_detections['detection_classes'], detections['detection_classes'], axis=0)
        all_detections['detection_multiclass_scores'] = np.append(all_detections['detection_multiclass_scores'], detections['detection_multiclass_scores'], axis=0)
        all_detections['detection_scores'] = np.append(all_detections['detection_scores'], detections['detection_scores'], axis=0)
        all_detections['num_detections'] = all_detections['num_detections'] + detections['num_detections']

    return all_detections


def filter_detections(detections, threshold):
    indices = (detections['detection_scores'] >= threshold).nonzero()[0]

    detections['detection_boxes'] = detections['detection_boxes'][indices]
    detections['detection_anchor_indices'] = detections['detection_anchor_indices'][indices]
    detections['detection_classes'] = detections['detection_classes'][indices]
    detections['detection_multiclass_scores'] = detections['detection_multiclass_scores'][indices]
    detections['detection_scores'] = detections['detection_scores'][indices]
    detections['num_detections'] = len(indices)


def save_inference(image, detections, image_inference_dir, image_name, category_index):
    image_path = os.path.join(image_inference_dir, f'{image_name}.png')
    image.save(image_path)
    logger.info(f'Created {full_path(image_path)}')

    # create function to convert y1, x1, y2, x2 to x1, y1, x2, y2
    func = lambda a: np.array([a[1], a[0], a[3], a[2]])

    for id in category_index:
        label = category_index[id]['name']
        label_path = os.path.join(image_inference_dir, f'{label}.csv')

        indices = (detections['detection_classes'] == id).nonzero()[0]

        # apply function and filter by indices
        boxes = np.array(list(map(func, detections['detection_boxes'][indices])))

        np.savetxt(label_path, boxes, fmt='%d', delimiter=',', comments='',
                   header=f'#label: {label}\nx1,y1,x2,y2')

        # with open(label_path, 'r+') as f:
        #     content = f.read()
        #     f.seek(0, 0)
        #     f.write(f'#label: {label}\n')
        #     f.write('x1,y1,x2,y2\n')
        #     f.write(content)

        logger.info(f'Created {full_path(label_path)}')


def main(name, image_path, model_name, model_width, model_height, stride_length):

    assert model_width == model_height  # TODO necessary?

    # directory for all inferences
    inference_dir = os.path.join(os.path.dirname(__file__), '../../inferences')
    create_directory_if_not_exists(inference_dir)

    # directory for the inferences for the mosaic the model was trained on
    mosaic_inference_dir = os.path.join(inference_dir, name)
    create_directory_if_not_exists(mosaic_inference_dir)

    # directory for inferences on this specific model
    model_inference_dir = os.path.join(mosaic_inference_dir, model_name)
    create_directory_if_not_exists(model_inference_dir)

    # directory for inferences on the input image
    image_name = image_path.replace('/', '\\').split('\\')[-1].split('.')[0] # name of image without extension
    image_inference_dir = os.path.join(model_inference_dir, image_name)
    create_directory_if_not_exists(image_inference_dir)

    # load the mosaic
    mosaic_dataset, mosaic_width, mosaic_height = load_mosaic(image_path)

    # get the top left corner coordinate for each slice to inference on
    slice_coords_list = generate_slice_coords(mosaic_width, mosaic_height, model_width, model_width, stride_length)

    # load the model
    detect_fn, category_index = load_from_saved_model(name, model_name)

    # iterate over all slices
    logger.info('Performing inference on full image...')
    all_detections = dict()
    for coord in tqdm(slice_coords_list):
        x, y = coord  # top left corner for this slice

        # get the image of this slice
        image = get_image_window(mosaic_dataset, x, y, model_width, model_height)

        # inference on this slice
        detections = inference(image, detect_fn, category_index)
        denormalize_detections(detections, model_width, model_height)
        convert_relative_detections_to_absolute(detections, x, y)
        all_detections = append_detection(all_detections, detections)

    # normalize_detections(all_detections, mosaic_width, mosaic_height)

    filter_detections(all_detections, 0.75)

    image_np_with_detections = place_detections_on_image(
        get_image_window(mosaic_dataset, 0, 0, mosaic_width, mosaic_height),
        all_detections,
        category_index)

    pil_image_with_detections = Image.fromarray(image_np_with_detections)
    save_inference(pil_image_with_detections, all_detections, image_inference_dir, image_name, category_index)

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
                        default=540)  # less than input dimensions to make sure objects on edges are not missed

    args = parser.parse_args()

    main(args.name, args.image_path, args.model_name, args.model_width, args.model_height, args.stride_length)
