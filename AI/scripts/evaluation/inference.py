"""
Run inference on a mosaic using a trained TensorFlow object detection model.
This will output the mosaic with detections on top and a CSV for each of the labels the model was trained on.

usage: inference.py [-h] [-n MODEL_UUID] [-i IMAGE_PATH] [-w MODEL_WIDTH]
                    [--model_height MODEL_HEIGHT] [-s STRIDE_LENGTH]

optional arguments:
  -h, --help            show this help message and exit
  -n MODEL_UUID, --model_uuid MODEL_UUID
                        the UUID of the model to use for inference
  -i IMAGE_PATH, --image_path IMAGE_PATH
                        the path to the image to run the inference on
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

import numpy as np
from PIL import Image
from tqdm import tqdm

from scripts.evaluation.model_inference import load_from_saved_model, inference
from scripts.util.file_utils import create_directory_if_not_exists, full_path, load_mosaic, get_image_window
from scripts.util.slice_utils import generate_slice_coords
from scripts.util.visualization_utils import place_detections_on_image

from scripts import ROOT_DIR

logger = logging.getLogger(__name__)


def create_dirs(model_uuid, image_path):
    """
    Create inference-related directories.

    :param model_uuid: the UUID of the model to use for inference
    :param image_path: the path to the image to perform the inference on
    :return: the name of the input image (without the extension) and the directory for inference output for this
        image using this model
    """

    # directory for all inferences
    inference_dir = os.path.join(ROOT_DIR, 'inferences')
    create_directory_if_not_exists(inference_dir)

    # directory for the inferences for this model
    model_inference_dir = os.path.join(inference_dir, model_uuid)
    create_directory_if_not_exists(model_inference_dir)

    # directory for inferences on the input image
    image_name = image_path.replace('/', '\\').split('\\')[-1].split('.')[0]  # name of image without extension
    image_inference_dir = os.path.join(model_inference_dir, image_name)
    create_directory_if_not_exists(image_inference_dir)

    return image_name, image_inference_dir


def denormalize_detections(detections, width, height):
    """
    Denormalize the bounding box coordinates in a detection dict in place.

    :param detections: a dict containing information about detections (contains bounding boxes with normalized
        coordinates)
    :param width: the width of the image the detections are for
    :param height: the height of the image the detections are for
    :return: none
    """

    # Create function to denormalize each set of coordinates.
    # The coordinates in the detection dict are ordered y1, x1, y2, x2.
    func = lambda a: np.array([a[0] * height, a[1] * width, a[2] * height, a[3] * width])

    # create function to round the absolute coordinates
    round_func = np.vectorize(round)

    # apply functions
    detections['detection_boxes'] = round_func(np.array(list(map(func, detections['detection_boxes']))))


def convert_relative_detections_to_absolute(detections, x, y):
    """
    Detections are for an image that represents a slice of a larger mosaic. The bounding box coordinates in the
    detections are relative to the origin (top left) of the slice. Convert these coordinates in place to be relative to
    the origin of the mosaic.

    :param detections: a dict containing information about detections (contains bounding boxes with denormalized
        coordinates)
    :param x: the x coordinate of the origin of this slice relative to the mosaic
    :param y: the y coordinate of the origin of this slice relative to the mosaic
    :return: none
    """

    # Create function to convert each set of relative coordinates to absolute.
    # The coordinates in the detection dict are ordered y1, x1, y2, x2.
    func = lambda a: np.array([a[0] + y, a[1] + x, a[2] + y, a[3] + x])

    # apply function
    detections['detection_boxes'] = np.array(list(map(func, detections['detection_boxes'])))


def append_detection(all_detections, detections):
    """
    Append detections to existing detections.

    :param all_detections: the existing detections (may be an empty dict)
    :param detections: a dict containing information about detections
    :return: the dict containing all the detections
    """

    # if all_detections is an empty dict, set it to detections
    if not all_detections:
        all_detections = detections
    else:
        # otherwise append each of the fields
        all_detections['detection_boxes'] = np.append(all_detections['detection_boxes'], detections['detection_boxes'], axis=0)
        all_detections['detection_anchor_indices'] = np.append(all_detections['detection_anchor_indices'], detections['detection_anchor_indices'], axis=0)
        all_detections['detection_classes'] = np.append(all_detections['detection_classes'], detections['detection_classes'], axis=0)
        all_detections['detection_multiclass_scores'] = np.append(all_detections['detection_multiclass_scores'], detections['detection_multiclass_scores'], axis=0)
        all_detections['detection_scores'] = np.append(all_detections['detection_scores'], detections['detection_scores'], axis=0)

        # sum of detections between the two
        all_detections['num_detections'] = all_detections['num_detections'] + detections['num_detections']

    # return the dict containing all the detections
    return all_detections


def filter_detections(detections, threshold):
    """
    Filter detections in place based off a threshold score.

    :param detections: a dict containing information about detections
    :param threshold: the threshold score for each detection
    :return: none
    """

    # calculate the indices of the detections that meet the threshold
    indices = (detections['detection_scores'] >= threshold).nonzero()[0]

    # keep only these indices
    detections['detection_boxes'] = detections['detection_boxes'][indices]
    detections['detection_anchor_indices'] = detections['detection_anchor_indices'][indices]
    detections['detection_classes'] = detections['detection_classes'][indices]
    detections['detection_multiclass_scores'] = detections['detection_multiclass_scores'][indices]
    detections['detection_scores'] = detections['detection_scores'][indices]
    detections['num_detections'] = len(indices)


def save_inference(image, detections, image_inference_dir, image_name, label_dict):
    """
    Save the detections for an image to files.
    This includes a copy of the image with the detections on top (with label and score) and a CSV for each of the
    labels the model was trained on.

    :param image: a PIL image of the full mosaic
    :param detections: a dict containing information about detections
    :param image_inference_dir: the directory containing inferences for this image from a specific model
    :param image_name: the name of the image (without the extension)
    :param label_dict: a dict mapping a label id to a dict containing its id and name
    :return: none
    """

    # place the detections on the image
    image_np_with_detections = place_detections_on_image(image, detections, label_dict)
    image_with_detections = Image.fromarray(image_np_with_detections)

    # save the new image as a PNG
    image_path = os.path.join(image_inference_dir, f'{image_name}.png')
    image_with_detections.save(image_path)
    logger.info(f'Created {full_path(image_path)}')

    # create function to convert bounding box coordinates from (y1, x1, y2, x2) to (x1, y1, x2, y2)
    func = lambda a: np.array([a[1], a[0], a[3], a[2]])

    # iterate over all the labels
    for id in label_dict:
        # get the label name
        label = label_dict[id]['name']
        # determine name of the output file for this label
        label_path = os.path.join(image_inference_dir, f'{label}.csv')

        # calculate indices of detections with this label
        indices = (detections['detection_classes'] == id).nonzero()[0]

        # apply function and filter by indices
        boxes = np.array(list(map(func, detections['detection_boxes'][indices])))

        # save the detections for this label to CSV
        np.savetxt(label_path, boxes, fmt='%d', delimiter=',', comments='',
                   header=f'#label: {label}\nx1,y1,x2,y2')

        logger.info(f'Created {full_path(label_path)}')


def main(model_uuid, image_path, model_width, model_height, stride_length):
    """
    Perform inference on an image and save the output.

    :param model_uuid: the UUID of the model to use for inference
    :param image_path: the path to the image to perform the inference on
    :param model_width: the width of the input to the model
    :param model_height: the height of the input to the model
    :param stride_length: how far to move each slice when traversing the mosaic
    :return: none
    """

    # ensure the input to the model is square to avoid distortion
    assert model_width == model_height

    # load the mosaic
    mosaic_dataset, mosaic_width, mosaic_height = load_mosaic(image_path)

    # load the model
    detect_fn, label_dict = load_from_saved_model(model_uuid)

    # get the top left corner coordinate for each slice to inference on
    slice_coords_list = generate_slice_coords(mosaic_width, mosaic_height, model_width, model_width, stride_length)

    # iterate over all slices
    logger.info('Performing inference on full image...')
    all_detections = dict()  # keep track of detections over all slices
    for coord in tqdm(slice_coords_list):
        # top left corner for this slice
        x, y = coord

        # get the image of this slice
        image = get_image_window(mosaic_dataset, x, y, model_width, model_height)

        # inference on this slice and collect detections
        detections = inference(image, detect_fn)
        denormalize_detections(detections, model_width, model_height)
        convert_relative_detections_to_absolute(detections, x, y)
        all_detections = append_detection(all_detections, detections)

    # only keep detections that meet a certain threshold
    filter_detections(all_detections, 0.90)

    # create inference-related directories
    image_name, image_inference_dir = create_dirs(model_uuid, image_path)

    # save the detections
    full_image = get_image_window(mosaic_dataset, 0, 0, mosaic_width, mosaic_height)
    save_inference(full_image, all_detections, image_inference_dir, image_name, label_dict)

    # close resources
    mosaic_dataset.close()


if __name__ == '__main__':
    parser = argparse.ArgumentParser()
    parser.add_argument('-n',
                        '--model_uuid',
                        help='the UUID of the model to use for inference',
                        type=str,
                        default='test')
    parser.add_argument('-i',
                        '--image_path',
                        help='the path to the image to run the inference on',
                        type=str,
                        default=os.path.join(os.path.dirname(__file__), '../../test/test/test1/test.tif'))
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

    main(args.model_uuid, args.image_path, args.model_width, args.model_height, args.stride_length)
