__author__ = 'Ian Randman'

import logging

import numpy as np
import pandas as pd
from object_detection.utils import visualization_utils as viz_utils

import matplotlib as mpl
mpl.use('module://backend_interagg')
import matplotlib.pyplot as plt

logger = logging.getLogger(__name__)


def show_image_as_figure(image):
    plt.figure()
    plt.imshow(image)
    plt.show()


def show_bounding_boxes(image, normalized_annotations):
    logger.info('Displaying bounding boxes for annotations...')

    df = pd.DataFrame(normalized_annotations, columns=['x1', 'y1', 'x2', 'y2', 'label'])
    image_copy = image.copy()
    viz_utils.draw_bounding_boxes_on_image(image_copy, df[['y1', 'x1', 'y2', 'x2']].to_numpy(),
                                           display_str_list_list=[[x] for x in list(df['label'])])

    show_image(image_copy)


def place_detections_on_image(image, detections, category_index, show_image=False):
    logger.info('Displaying bounding boxes for detections...')

    image = image.convert('RGB')
    image_np_with_detections = np.array(image)

    viz_utils.visualize_boxes_and_labels_on_image_array(
        image_np_with_detections,
        detections['detection_boxes'],
        detections['detection_classes'],
        detections['detection_scores'],
        category_index,
        use_normalized_coordinates=False,
        max_boxes_to_draw=None,
        min_score_thresh=0,
        agnostic_mode=False)

    if show_image:
        show_image_as_figure(image_np_with_detections)

    return image_np_with_detections
