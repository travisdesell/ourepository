__author__ = 'Ian Randman'

import logging

import pandas as pd
from object_detection.utils import visualization_utils as viz_utils

import matplotlib as mpl
mpl.use('module://backend_interagg')
import matplotlib.pyplot as plt

logger = logging.getLogger(__name__)


def show_bounding_boxes(image, normalized_annotations):
    df = pd.DataFrame(normalized_annotations, columns=['x1', 'y1', 'x2', 'y2', 'label'])
    image_copy = image.copy()
    viz_utils.draw_bounding_boxes_on_image(image_copy, df[['y1', 'x1', 'y2', 'x2']].to_numpy(),
                                           display_str_list_list=[[x] for x in list(df['label'])])

    plt.figure()
    plt.imshow(image_copy)

    plt.show()