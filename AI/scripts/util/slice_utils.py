"""
Provides utilities for the slices that are generated from each mosaic.
Includes generating the coordinates of each slice and transforming the image for the slice.
"""

__author__ = 'Ian Randman'

import logging
import random
from itertools import product

import numpy as np
import cv2
from PIL import Image

logger = logging.getLogger(__name__)


def generate_slice_coords(mosaic_width, mosaic_height, slice_width, slice_height, stride_length):
    """
    Chop up an image into slices for easier handling.
    Generate a list of (x, y) coordinates for the top left corner of each slice. Slices may overlap, and so a stride
    length determines the spacing between slices. To ensure that all slices have the same dimensions, the slices on
    the right/bottom of the image may be less than a stride length away from adjacent slices in each direction.

    :param mosaic_width: the width of the mosaic to create slices of
    :param mosaic_height: the height of the mosaic to create slices of
    :param slice_width: the width of the slices to make
    :param slice_height: the height of the slices to make
    :param stride_length: the number of pixels in each direction to space out slices
    :return: a list containing the coordinates of the top left corner of each slice
    """

    # determine upper left corner of each slice
    # uses sliding window

    # get x and y coordinates for each slice
    slice_x_coords = list(range(0, mosaic_width - slice_width, stride_length))
    slice_x_coords.append(mosaic_width - slice_width) # right-most slices
    slice_y_coords = list(range(0, mosaic_height - slice_height, stride_length))
    slice_y_coords.append(mosaic_height - slice_height) # bottom-most slices

    # cartesian product of x and y coordinates results in coordinate pairs for full array
    slice_coords_list = list(product(slice_x_coords, slice_y_coords))

    # return the list of coordinates
    return slice_coords_list


def generate_slice_coords_with_annotations(mosaic_width, mosaic_height, slice_width, slice_height, stride_length,
                                           annotations_df):
    """
    Chop up an image into slices for easier handling.
    Associate each slice with all of the annotation bounding boxes fully contained within the slice.


    :param mosaic_width: the width of the mosaic to create slices of
    :param mosaic_height: the height of the mosaic to create slices of
    :param slice_width: the width of the slices to make
    :param slice_height: the height of the slices to make
    :param stride_length: the number of pixels in each direction to space out slices
    :param annotations_df: a dataframe where each row contains (x1, y1, x2, y2, label) for each annotation
    :return: a dict where the key is the (x, y) for top left of the slice, and the value is a list of 5-tuples
        containing (x1, y1, x2, y2, label) for each annotation in the slice
    """

    # generate the (x, y) coordinates for the top left of each slice
    slice_coords_list = generate_slice_coords(mosaic_width, mosaic_height, slice_width, slice_height, stride_length)
    # initialize the dictionary with an empty list for each slice
    slice_coords_dict = {key: list() for key in slice_coords_list}

    # iterate over all annotations
    total_annotations = 0
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

        # Start is the left-most/top-most coordinate of the left-most/top-most slice that would contain this
        # annotation. End is the left-most/top-most coordinate of the right-most/bottom-most slice that would contain
        # this annotation.

        x_start = max(0, x2 - slice_width)
        x_start = (int(x_start / stride_length) + (x_start % stride_length != 0)) * stride_length
        x_start = min(x_start, mosaic_width - slice_width)
        x_end = min(x2 - annotation_width, mosaic_width - slice_width)

        y_start = max(0, y2 - slice_height)
        y_start = (int(y_start / stride_length) + (y_start % stride_length != 0)) * stride_length
        y_start = min(y_start, mosaic_height - slice_height)
        y_end = min(y2 - annotation_height, mosaic_height - slice_height)

        # add this annotation to all slices that include it
        for coord in product(range(x_start, x_end + 1, stride_length), range(y_start, y_end + 1, stride_length)):
            slice_coords_dict[coord].append(tuple(row))
            total_annotations += 1

    logger.info(f"{total_annotations} total annotations over all slices")

    # return the dict of the slices to the annotations contained within them
    return slice_coords_dict


def perspective_transform(image, normalized_annotations, theta=0.7, gamma=0.3):
    """
    This is an implementation of perspective transform data augmentation as described in:
    https://ieeexplore.ieee.org/stamp/stamp.jsp?tp=&arnumber=8943416.

    An image is transformed along with the annotations it contains.

    :param image: a PIL image
    :param normalized_annotations: the normalized annotations (x1, y1, x2, y2, label)
    :param theta: the image plane rotation (maybe)
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

    # iterate over all annotations and apply the perspective transform
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

        # collect the new annotation
        transformed_annotations.append((x_min, y_min, x_max, y_max, label))

    # apply the perspective transform to the image; must convert to OpenCV image first
    open_cv_image = cv2.cvtColor(np.array(image), cv2.COLOR_RGBA2mRGBA)
    result = cv2.warpPerspective(open_cv_image, matrix, (width, height))

    # TODO
    # Transform results in transparent borders.
    # Paper describes methods such as reflection, cropping, or filling in with black to mitigate effects.
    # Must decide how to handle affected annotations if reflection or cropping is selected.

    return Image.fromarray(result), transformed_annotations


def transform(image, normalized_annotations):
    """
    Perform a transform on an image and its annotations to increase robustness of object detection learning.

    :param image: the PIL image
    :param normalized_annotations: the normalized annotations (x1, y1, x2, y2, label)
    :return: the transformed image and transformed normalized annotations
    """

    # TODO add other transformations?; change randomization?
    # flip horizontally
    # image_np = np.fliplr(image_np).copy()

    # convert image to grayscale
    # image_np = np.tile(
    #     np.mean(image_np, 2, keepdims=True), (1, 1, 3)).astype(np.uint8)

    # randomly choose whether to apply a perspective transformation
    if random.random() < 0.5:
        return perspective_transform(image, normalized_annotations)
    else:
        return image, normalized_annotations
