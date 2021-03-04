__author__ = 'Ian Randman'

import logging
import random
from itertools import product

import numpy as np
import cv2
from PIL import Image

logger = logging.getLogger(__name__)


def generate_slice_coords(mosaic_width, mosaic_height, model_width, model_height, stride_length):
    # determine upper left corner of each slice
    # uses sliding window
    slice_x_coords = list(range(0, mosaic_width - model_width, stride_length))
    slice_x_coords.append(mosaic_width - model_width)
    slice_y_coords = list(range(0, mosaic_height - model_height, stride_length))
    slice_y_coords.append(mosaic_height - model_height)
    slice_coords_list = list(product(slice_x_coords, slice_y_coords))

    return slice_coords_list


def generate_slice_coords_with_annotations(mosaic_width, mosaic_height, model_width, model_height, stride_length,
                                           annotations_df):
    slice_coords_list = generate_slice_coords(mosaic_width, mosaic_height, model_width, model_height, stride_length)
    slice_coords_dict = {key: list() for key in slice_coords_list}

    total_annotations = 0

    # iterate over all annotations
    for index, row in annotations_df.iterrows():
        # get corners of annotation
        x1 = row['x1']
        x2 = row['x2']
        y1 = row['y1']
        y2 = row['y2']
        assert x1 <= x2
        assert y1 <= y2

        # calculate width and height of annotation
        annotation_width = x2 - x1
        annotation_height = y2 - y1

        # Get all slices that have full annotation in them.
        # Start coordinate must be at least 0.
        # Start coordinate must be the start of a slice; cannot be between slices (if so, go to next slice).
        # Repeat for x and y.

        # Start is the left-most/top-most coordinate of the left-most/top-most slice that would contain this annotation.
        # End is the left-most/top-most coordinate of the right-most/bottom-most slice that would contain this annotation.

        x_start = max(0, x2 - model_width)
        x_start = (int(x_start / stride_length) + (x_start % stride_length != 0)) * stride_length
        x_start = min(x_start, mosaic_width - model_width)
        x_end = min(x2 - annotation_width, mosaic_width - model_width)

        y_start = max(0, y2 - model_height)
        y_start = (int(y_start / stride_length) + (y_start % stride_length != 0)) * stride_length
        y_start = min(y_start, mosaic_height - model_height)
        y_end = min(y2 - annotation_height, mosaic_height - model_height)

        # add this annotation to all slices that include it
        for coord in product(range(x_start, x_end + 1, stride_length), range(y_start, y_end + 1, stride_length)):
            slice_coords_dict[coord].append(tuple(row))
            total_annotations += 1

    logger.info(f"{total_annotations} total annotations over all slices")

    return slice_coords_dict


def perspective_transform(image, normalized_annotations, theta=0.7, gamma=0.3):
    """
    This is an implementation of perspective transform data augmentation as described in:
    https://ieeexplore.ieee.org/stamp/stamp.jsp?tp=&arnumber=8943416.

    An image is transformed along with the annotations it contains.

    :param image: the PIL image
    :param normalized_annotations: the normalized annotations (x1, y1, x2, y2, label)
    :param theta: the image plane rotation
    :param gamma: unknown TODO ?
    :return: the transformed image and transformed normalized annotations
    """

    # image dimensions
    width = image.width
    height = image.height

    # get coordinates for perspective
    x_tl, x_bl, x_br, x_tr = \
        [random.uniform(0, width * gamma * theta) for _ in range(4)]
    y_tl, y_bl, y_br, y_tr = \
        [random.uniform(0, height * gamma * theta) for _ in range(4)]

    A_theta = [x_tl, y_tl]  # top left
    B_theta = [x_bl, height - y_bl]  # bottom left
    C_theta = [width - x_br, height - y_br]  # bottom right
    D_theta = [width - x_tr, y_tr]  # top right

    # create transformation matrix
    pts1 = np.float32([[0, 0], [0, height], [width, height], [width, 0]])
    pts2 = np.float32([A_theta, B_theta, C_theta, D_theta])
    matrix = cv2.getPerspectiveTransform(pts1, pts2)

    transformed_annotations = list()
    for x1, y1, x2, y2, label in normalized_annotations:
        # coordinates for all four corners of annotation; must use absolute coordinates
        x_tl, x_bl, x_tr, x_br = np.array((x1, x1, x2, x2)) * width
        y_tl, y_bl, y_tr, y_br = np.array((y1, y1, y2, y2)) * height

        # transform each coordinate
        pts = zip((x_tl, x_bl, x_tr, x_br), (y_tl, y_bl, y_tr, y_br))
        p_tl, p_bl, p_tr, p_br = \
            np.squeeze(
                cv2.perspectiveTransform(
                    np.array(
                        [[[x, y]] for x, y in pts], dtype='float32'
                    ),
                    matrix
                ))

        # get coordinates of new bounding box based on extrema; must convert back to normalized coordinates
        x_min = min(p_tl[0], p_bl[0], p_tr[0], p_br[0]) / width
        x_max = max(p_tl[0], p_bl[0], p_tr[0], p_br[0]) / width
        y_min = min(p_tl[1], p_bl[1], p_tr[1], p_br[1]) / height
        y_max = max(p_tl[1], p_bl[1], p_tr[1], p_br[1]) / height

        transformed_annotations.append((x_min, y_min, x_max, y_max, label))

    open_cv_image = cv2.cvtColor(np.array(image), cv2.COLOR_RGBA2mRGBA)
    result = cv2.warpPerspective(open_cv_image, matrix, (width, height))

    # TODO transform results in white borders. Paper describes methods such as reflection to mitigate effects.

    return Image.fromarray(result), transformed_annotations


def transform(image, normalized_annotations):
    """
    Perform a transform on an image and its annotations to increase robustness of object detection learning.

    :param image: the PIL image
    :param normalized_annotations: the normalized annotations (x1, y1, x2, y2, label)
    :return: the transformed image and transformed normalized annotations
    """

    # TODO add other transformations?; randomize?
    return perspective_transform(image, normalized_annotations)
