"""
Provides inference-related functions related to the TensorFlow model.
Includes loading the model from a SavedModel and performing inference on an image using this model.
"""

__author__ = 'Ian Randman'

import logging
import os

os.environ['TF_CPP_MIN_LOG_LEVEL'] = '2'  # suppress TensorFlow logging

import numpy as np
import tensorflow as tf
import time
from object_detection.utils import label_map_util

from scripts.util.visualization_utils import place_detections_on_image

from scripts import ROOT_DIR

logger = logging.getLogger(__name__)


def load_from_saved_model(model_uuid):
    """
    Load a TensorFlow object detection SavedModel and its labels.
    Create a detection function from the model.

    :param model_uuid: the UUID of the model to load
    :return: the TensorFlow function that came from a SavedModel and a dict containing label information
    """

    # enable GPU dynamic memory allocation
    gpus = tf.config.experimental.list_physical_devices('GPU')
    for gpu in gpus:
        tf.config.experimental.set_memory_growth(gpu, True)

    # path to the SavedModel
    saved_model_path = os.path.join(ROOT_DIR, 'exported-models', model_uuid, 'saved_model')
    # path to the label map for the model
    label_map_path = os.path.join(ROOT_DIR, 'annotations', model_uuid, 'label_map.pbtxt')

    logger.info('Loading model...')
    start_time = time.time()

    # load saved model and build the detection function
    detect_fn = tf.saved_model.load(saved_model_path)

    end_time = time.time()
    elapsed_time = end_time - start_time
    logger.info('Finished loading model! Took {} seconds'.format(elapsed_time))

    # load label map data (for plotting)
    label_dict = label_map_util.create_category_index_from_labelmap(label_map_path, use_display_name=True)

    # return the detection function and the label dict
    return detect_fn, label_dict


def inference(image, detect_fn):
    """
    Perform an inference on an image using a TensorFlow object detection function.

    :param image: a PIL image (assumed RGBA)
    :param detect_fn: the TensorFlow function that came from a SavedModel. Not compatible with Checkpoint function.
    :param label_dict: a dict mapping a label id to a dict containing its id and name
    :return: a dict containing information about detections
    """

    # convert the image to RGB then copy into NumPy array
    image = image.convert('RGB')
    image_np = np.array(image)

    # the input needs to be a tensor, convert it using `tf.convert_to_tensor`
    input_tensor = tf.convert_to_tensor(image_np)
    # the model expects a batch of images, so add an axis with `tf.newaxis`
    input_tensor = input_tensor[tf.newaxis, ...]

    # perform the inference
    detections = detect_fn(input_tensor)

    # All outputs are batches tensors.
    # Convert to numpy arrays, and take index [0] to remove the batch dimension.
    # We're only interested in the first num_detections.
    num_detections = int(detections.pop('num_detections'))
    detections = {key: value[0, :num_detections].numpy()
                  for key, value in detections.items()}
    detections['num_detections'] = num_detections

    # detection_classes should be ints
    detections['detection_classes'] = detections['detection_classes'].astype(np.int64)

    # delete some fields that will not be used later
    del detections['raw_detection_boxes']
    del detections['raw_detection_scores']

    # uncomment to show detections on image
    # place_detections_on_image(image, detections, label_dict)

    # return the detections dict
    return detections
