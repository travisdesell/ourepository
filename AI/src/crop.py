"""
Split up a large mosaic into overlapping slices to be used as part of a machine learning pipeline. Create both images
and XMLs for each slice.

@author: Ian Randman
@author: John McCarroll
"""

from PIL import Image, ImageDraw
import rasterio as rio
from rasterio.windows import Window
import numpy as np
from itertools import product
from matplotlib import pyplot
import csv
import pandas as pd
import os
import shutil
import click
import time
import sys

from make_xml import make_xml
from progress_bar import progressBar

DATA_DIR = os.path.abspath(os.path.join(os.path.dirname(os.path.abspath(__file__)), '../data'))
CARIBOU_DIR = os.path.abspath(os.path.join(DATA_DIR, 'caribou'))
OUT_DIR = os.path.abspath(os.path.join(CARIBOU_DIR, 'out'))  # TODO change to make for easier preprocessing later
CONTINUE_CHECKPOINT = False  # check whether slice creation should continue from where it left off
EXISTING_FILES = os.listdir(OUT_DIR)  # existing files in output (to be used for checkpoint continuation)

# check whether the output directory exists
if os.path.exists(OUT_DIR):
    # check whether slice creation should start from the beginning
    if click.confirm('Do you want to remove existing output?'):
        shutil.rmtree(OUT_DIR)
        os.makedirs(OUT_DIR)
    else:
        # check whether slice creation should continue from where it left off
        if click.confirm('Do you want to continue from where you left off?'):
            CONTINUE_CHECKPOINT = True
        else:
            # if the user does not want to delete existing output and does not want to continue from where it left
            # off, exit program
            sys.exit(1)
else:
    # create output directory if it does not yet exist
    os.makedirs(OUT_DIR)

CARIBOU_IMAGE_FILENAME = os.path.join(CARIBOU_DIR, '20160718_camp_gm_02_75m_transparent_mosaic_group1.tif')
# caribou_csv_file_name = os.path.join(CARIBOU_DIR, 'mosaic_97_adult_caribou.csv')
CARIBOU_CSV_FILENAME = os.path.join(CARIBOU_DIR, 'test.csv')

# Training Specs
MODEL_INPUT_HEIGHT = 640 # TODO must this be same as model?
MODEL_INPUT_WIDTH = 640

# how far to move sliding window for each slice
STRIDE_LENGTH = 64

# load in tif mosaic
mosaic_dataset = rio.open(CARIBOU_IMAGE_FILENAME)

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

# create dataframe contaning annotation data
annotations_df = pd.read_csv(CARIBOU_CSV_FILENAME, comment='#')

# determine upper left corner of each slice
# uses sliding window
slice_x_coords = list(range(0, MOSAIC_WIDTH-MODEL_INPUT_WIDTH, STRIDE_LENGTH))
slice_x_coords.append(MOSAIC_WIDTH-MODEL_INPUT_WIDTH)
slice_y_coords = list(range(0, MOSAIC_HEIGHT-MODEL_INPUT_HEIGHT, STRIDE_LENGTH))
slice_y_coords.append(MOSAIC_HEIGHT-MODEL_INPUT_HEIGHT)
slice_coords_list = list(product(slice_x_coords, slice_y_coords))
slice_coords_dict = {key: list() for key in slice_coords_list}

total_annotations = 0
tic = time.perf_counter()

# iterate over alll annotations
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

    x_start = max(0, x2 - MODEL_INPUT_WIDTH)
    x_start = (int(x_start / STRIDE_LENGTH) + (x_start % STRIDE_LENGTH != 0)) * STRIDE_LENGTH
    x_end = min(x2 - annotation_width, MOSAIC_WIDTH - MODEL_INPUT_WIDTH)

    y_start = max(0, y2 - MODEL_INPUT_HEIGHT)
    y_start = (int(y_start / STRIDE_LENGTH) + (y_start % STRIDE_LENGTH != 0)) * STRIDE_LENGTH
    y_end = min(y2 - annotation_height, MOSAIC_HEIGHT - MODEL_INPUT_HEIGHT)

    # add this annotation to all slices that include it
    for coord in product(range(x_start, x_end, STRIDE_LENGTH), range(y_start, y_end, STRIDE_LENGTH)):
        slice_coords_dict[coord].append(tuple(row))
        total_annotations += 1

toc = time.perf_counter()
print(f"{toc - tic:0.4f} seconds")
print(f"{total_annotations} total annotations over all slices")

# TODO remove
# remove all slices without an annotation (performed here to make progress bar more accurate)
slice_coords_dict_all = slice_coords_dict
slice_coords_dict = {coord:annotations for (coord, annotations) in slice_coords_dict.items() if len(annotations) > 0}

# loop over slices
# for coord in slice_coords_dict: TODO maybe put back
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

    # make the XML to be used to generate TFRecords and store along with output images
    make_xml(rel_annotations, MODEL_INPUT_WIDTH, MODEL_INPUT_HEIGHT, filepath)

    # draw rectangle to represent annotation
    # draw.rectangle((rel_x1, rel_y1, rel_x2, rel_y2), fill=(255, 0, 0, 50),
    #                outline=(255, 255, 255))  # add annotations

    # save relative coordinates to file
    # writer.writerow([rel_x1, rel_y1, rel_x2, rel_y2])  # write relative bounds to file

    # Save image. Uncomment next line to add annotation overlay to image.
    # image = Image.alpha_composite(image, overlay)
    image.save(f'{filepath}.png')

    # TODO remove
    # if x >= 2944 and y >= 46912:  # this is the first slice with more than one annotation
    #     break

# close resources
mosaic_dataset.close()
