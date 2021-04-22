"""
Provides utilities for visualization.
Includes visualization of bounding boxes for annotations/detections.
"""

__author__ = 'Ian Randman'

import logging

import numpy as np
import pandas as pd
from object_detection.utils import visualization_utils as viz_utils

import matplotlib.pyplot as plt
import matplotlib as mpl

# May fail depending on installation of matplotlib. If so, Google matplotlib backend for the system you are on.
#mpl.use('TkAgg')

logger = logging.getLogger(__name__)


def show_image_as_figure(image):
    """
    Show an image in a matplotlib plot.

    :param image: a PIL image or NumPy image array
    :return: none
    """

    plt.figure()
    plt.imshow(image)
    plt.show()


def show_bounding_boxes(image, normalized_annotations):
    """
    Display bounding boxes for annotations on an image.

    :param image: a PIL image
    :param normalized_annotations: a collection of normalized annotations, where each takes the form x1, y1, x2, y2,
        label (str)
    :return: none
    """

    logger.info('Displaying bounding boxes for annotations...')

    # load annotations into dataframe
    df = pd.DataFrame(normalized_annotations, columns=['x1', 'y1', 'x2', 'y2', 'label'])

    # place bounding boxes on a copy of the image
    image_copy = image.copy()
    viz_utils.draw_bounding_boxes_on_image(image_copy, df[['y1', 'x1', 'y2', 'x2']].to_numpy(),
                                           display_str_list_list=[[x] for x in list(df['label'])])

    # show the image as a matplotlib plot
    show_image_as_figure(image_copy)


def place_detections_on_image(image, detections, label_dict, show_image=False):
    """
    Place a collection of detections on an image.
    Detections include bounding boxes, labels, and scores.

    :param image: a PIL image (assumed RGBA)
    :param detections: a dict containing information about detections
    :param label_dict: a dict mapping a label id to a dict containing its id and name
    :param show_image: whether to show the new image as a matplotlib plot
    :return: a copy of the image with the detections
    """

    logger.info('Placing detections on image...')

    # convert the image to RGB then copy into NumPy array
    image = image.convert('RGB')
    image_np_with_detections = np.array(image)

    # Place the detections on the NumPy array image.
    # It is configured with no limit on the number of boxes to draw and no minimum score threshold, because it is
    # assumed the detections will be filtered beforehand.
    viz_utils.visualize_boxes_and_labels_on_image_array(
        image_np_with_detections,
        detections['detection_boxes'],
        detections['detection_classes'],
        detections['detection_scores'],
        label_dict,
        use_normalized_coordinates=False,
        max_boxes_to_draw=None,
        min_score_thresh=0,
        agnostic_mode=False)

    # determine whether to show the new image as a matplotlib figure
    if show_image:
        logger.info('Displaying bounding boxes for detections...')
        show_image_as_figure(image_np_with_detections)

    # return the NumPy array image with the detections on top
    return image_np_with_detections
