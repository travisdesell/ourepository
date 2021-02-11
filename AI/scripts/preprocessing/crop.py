"""
Split up a large mosaic into overlapping slices to be used as part of a machine learning pipeline. Create both images
and XMLs for each slice.

@author: Ian Randman
@author: John McCarroll
"""
import random

from PIL import Image
import numpy as np
import csv
import pandas as pd
import cv2
import os
import shutil
import click
import sys
from object_detection.utils import label_map_util

import tensorflow.compat.v1 as tf
from generate_tfrecord import create_tf_example_new

import rasterio as rio
from rasterio.windows import Window

from scripts.util.progress_bar import progressBar
from scripts.util.make_xml import make_xml
from scripts.util.slice import generate_slice_coords

# TODO doing it this way to have a clean path in the generated XML. This may not be necessary. Possible change to relative.
# DATA_DIR = os.path.abspath(os.path.join(os.path.dirname(os.path.abspath(__file__)), '../../original-data/caribou'))
DATA_DIR = os.path.abspath(os.path.join(os.path.dirname(os.path.abspath(__file__)), '../../test'))
OUT_DIR = os.path.abspath(os.path.join(os.path.dirname(os.path.abspath(__file__)), '../../images', DATA_DIR.split('\\')[-1]))
CONTINUE_CHECKPOINT = False  # check whether slice creation should continue from where it left off
EXISTING_FILES = list()  # existing files in output (to be used for checkpoint continuation)

# Training Specs
MODEL_INPUT_HEIGHT = 640 # TODO must this be same as model? I don't think so, but it probably mitigates effects of distortion.
MODEL_INPUT_WIDTH = 640

# how far to move sliding window for each slice
STRIDE_LENGTH = 64

# # check whether the output directory exists
# if os.path.exists(OUT_DIR):
#     # check whether slice creation should start from the beginning
#     if click.confirm(f'Do you want to remove existing output in:\n{OUT_DIR}\n'):
#         shutil.rmtree(OUT_DIR)
#         os.makedirs(OUT_DIR)
#     else:
#         # check whether slice creation should continue from where it left off
#         if click.confirm('Do you want to continue from where you left off?'):
#             CONTINUE_CHECKPOINT = True
#             EXISTING_FILES = os.listdir(OUT_DIR)
#         else:
#             # if the user does not want to delete existing output and does not want to continue from where it left
#             # off, exit program
#             sys.exit(1)
# else:
#     # create output directory if it does not yet exist
#     os.makedirs(OUT_DIR)

# IMAGE_FILENAME = os.path.join(DATA_DIR, '20160718_camp_gm_02_75m_transparent_mosaic_group1.tif')
# CSV_FILENAME = os.path.join(DATA_DIR, 'test.csv')
IMAGE_FILENAME = os.path.join(DATA_DIR, 'test.png')
CSV_FILENAME = os.path.join(DATA_DIR, 'test.csv')

# load in tif mosaic
mosaic_dataset = rio.open(IMAGE_FILENAME)

# display attrs
print("Number of bands:")
print(mosaic_dataset.count)

print("Width and height:")
MOSAIC_WIDTH = mosaic_dataset.width
MOSAIC_HEIGHT = mosaic_dataset.height
print(MOSAIC_WIDTH)
print(MOSAIC_HEIGHT)

print("Band properties:")
print({i: dtype for i, dtype in zip(mosaic_dataset.indexes, mosaic_dataset.dtypes)})

# view image (bands)
# print("Reading Mosaic Data")
# for i in range(1,mosaic_dataset.count + 1):
#    array = mosaic_dataset.read(i)
#    pyplot.imshow(array)
#    pyplot.show()
#    break

# view transform
print("Mosaic Transform:")
print(mosaic_dataset.transform)

# view bounds
print("Mosaic Bounds")
print(mosaic_dataset.bounds)

# view Coordinate Reference System
print("Mosaic CRS:")
print(mosaic_dataset.crs)

# load label map
LABEL_MAP = label_map_util.load_labelmap('../../annotations/test/label_map.pbtxt')

# create dataframe containing annotation data
annotations_df = pd.read_csv(CSV_FILENAME, comment='#')

slice_coords_dict = generate_slice_coords(MOSAIC_WIDTH, MOSAIC_HEIGHT, MODEL_INPUT_WIDTH, MODEL_INPUT_WIDTH,
                                          STRIDE_LENGTH, annotations_df)

# TODO remove (maybe)
# remove all slices without an annotation (performed here to make progress bar more accurate)
slice_coords_dict_all = slice_coords_dict
slice_coords_dict = {coord:annotations for (coord, annotations) in slice_coords_dict.items() if len(annotations) > 0}
percent_containing_annotations = 100 * len(slice_coords_dict) / len(slice_coords_dict_all)
print(f'{round(percent_containing_annotations, 2)}% of all slices contain annotations')

train_output_path = '../../annotations/test/train.record'
train_writer = tf.python_io.TFRecordWriter(train_output_path)
test_output_path = '../../annotations/test/test.record'
test_writer = tf.python_io.TFRecordWriter(test_output_path)

# create train/test split
in_train_split = dict()
coords_list = list(slice_coords_dict.keys())
random.shuffle(coords_list)
ratio = 0.9
first_half = int(len(coords_list) * ratio)
for coord in coords_list[:first_half]:
    in_train_split[coord] = True
for coord in coords_list[first_half:]:
    in_train_split[coord] = False

# loop over slices
# for coord in slice_coords_dict: TODO maybe put back
images = list()
for coord in progressBar(slice_coords_dict, prefix='Progress:', suffix='Complete', length=50):
    annotations = slice_coords_dict[coord]  # annotations for this slice
    x, y = coord  # top left corner for this slice
    filename_prefix = f'sample_{x}_{y}'  # name of file without extension

    # not necessary here anymore because of removal of slices earlier
    # if not annotations: # if no annotations for this slice; TODO remove
    #     continue

    # check whether slice creation should continue from where it left off
    if CONTINUE_CHECKPOINT and (filename_prefix + '.xml') in EXISTING_FILES:
        continue

    # if saved image is corrupt, retry up to 5 times total
    retry = 0

    while 0 <= retry < 5:
        # read band slices using Window views
        sample_red = mosaic_dataset.read(1, window=Window(x, y, MODEL_INPUT_WIDTH, MODEL_INPUT_HEIGHT))
        sample_green = mosaic_dataset.read(2, window=Window(x, y, MODEL_INPUT_WIDTH, MODEL_INPUT_HEIGHT))
        sample_blue = mosaic_dataset.read(3, window=Window(x, y, MODEL_INPUT_WIDTH, MODEL_INPUT_HEIGHT))
        sample_alpha = mosaic_dataset.read(4, window=Window(x, y, MODEL_INPUT_WIDTH, MODEL_INPUT_HEIGHT))

        # add new axis for RGBA values
        sample_red = sample_red[:, :, np.newaxis]
        sample_green = sample_green[:, :, np.newaxis]
        sample_blue = sample_blue[:, :, np.newaxis]
        sample_alpha = sample_alpha[:, :, np.newaxis]

        # concatenate bands along new RGBA axis
        sample = np.concatenate([sample_red, sample_green, sample_blue, sample_alpha], axis=2)

        # create image
        image = Image.fromarray(sample, mode='RGBA')  # create image

        # annotate image
        # overlay = Image.new('RGBA', image.size, (0, 0, 0, 0))
        # draw = ImageDraw.Draw(overlay) # create Draw object

        filepath = f'{OUT_DIR}/{filename_prefix}'  # full filepath of output files excluding extension
        # with open(filename_prefix + '.csv', 'w') as csv_file:
            # writer = csv.writer(csv_file)
            # writer.writerow(['x1', 'y1', 'x2', 'y2'])
        rel_annotations = list()

        # iterate over all annotations in slice
        for x1, y1, x2, y2 in annotations:
            # calculate relative coordinates for annotation in slice
            rel_x1 = x1 - x
            rel_y1 = y1 - y
            rel_x2 = x2 - x
            rel_y2 = y2 - y

            rel_annotations.append((rel_x1, rel_y1, rel_x2, rel_y2))

        # create the TFExample
        tf_example = create_tf_example_new(rel_annotations, image, 'butterfly', LABEL_MAP)
        if in_train_split[coord]:
            train_writer.write(tf_example.SerializeToString())
        else:
            test_writer.write(tf_example.SerializeToString())

        # make the XML to be used to generate TFRecords and store along with output images
        # make_xml(rel_annotations, MODEL_INPUT_WIDTH, MODEL_INPUT_HEIGHT, filepath, 'butterfly')

        # draw rectangle to represent annotation
        # draw.rectangle((rel_x1, rel_y1, rel_x2, rel_y2), fill=(255, 0, 0, 50),
        #                outline=(255, 255, 255))  # add annotations

        # save relative coordinates to file
        # writer.writerow([rel_x1, rel_y1, rel_x2, rel_y2])  # write relative bounds to file

        # Save image. Uncomment next line to add annotation overlay to image.
        # image = Image.alpha_composite(image, overlay)
        # image_path = filepath + '.png'
        # images.append(image)
        # image.save(image_path)
        retry -= 1

        # retry if saved image is corrupt
        # if cv2.imread(image_path) is None:
        #     retry += 1
        # else:
        #     retry -= 1

# close resources
train_writer.close()
print('Successfully created the TFRecord file: {}'.format(train_output_path))
test_writer.close()
print('Successfully created the TFRecord file: {}'.format(test_output_path))

mosaic_dataset.close()
