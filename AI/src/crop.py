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

DATA_DIR = os.path.join(os.path.dirname(os.path.abspath(__file__)), '../data')
CARIBOU_DIR = os.path.join(DATA_DIR, 'caribou')
OUT_DIR = os.path.join(CARIBOU_DIR, 'out')
CONTINUE_CHECKPOINT = False

if os.path.exists(OUT_DIR):
    if click.confirm('Are you sure you want to remove existing output?'):
        shutil.rmtree(OUT_DIR)
        os.makedirs(OUT_DIR)
    else:
        sys.exit(1)

    # if click.confirm('Do you want to continue from last saved slice?'):
    #     CONTINUE_CHECKPOINT = True
    # else:
    #     if click.confirm('Are you sure you want to remove existing output?'):
    #         shutil.rmtree(OUT_DIR)
    #         os.makedirs(OUT_DIR)
# else:
#     os.makedirs(OUT_DIR)

CARIBOU_IMAGE_FILENAME = os.path.join(CARIBOU_DIR, '20160718_camp_gm_04_75m_caribou_transparent_mosaic_group1.tif')
# caribou_csv_file_name = os.path.join(CARIBOU_DIR, 'mosaic_97_adult_caribou.csv')
CARIBOU_CSV_FILENAME = os.path.join(CARIBOU_DIR, 'test.csv')

# Training Specs
MODEL_INPUT_HEIGHT = 512
MODEL_INPUT_WIDTH = 512

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
for index, row in annotations_df.iterrows():
    # get corners of annotation
    x1 = row['x1']
    x2 = row['x2']
    y1 = row['y1']
    y2 = row['y2']
    assert x1 <= x2
    assert y1 <= y2

    annotation_width = x2 - x1
    annotation_height = y2 - y1

    # Get all slices that have full annotation in them.
    # Start coordinate must be at least 0.
    # Start coordinate must be the start of a slice; cannot be between slices (if so, go to next slice).
    # repeat for x and y

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

# loop over slices
for coord in slice_coords_dict:
    annotations = slice_coords_dict[coord]
    if not annotations: # if no annotations for this slice; TODO remove
        continue

    x, y = coord  # top left corner for this slice

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

    # annotate
    image = Image.fromarray(sample, mode='RGBA')  # create image
    # overlay = Image.new('RGBA', image.size, (0, 0, 0, 0))
    # draw = ImageDraw.Draw(overlay) # create Draw object

    # filename = os.path.abspath(__file__0
    file_path = f'{OUT_DIR}/sample_{x}_{y}'
    # with open(filename_prefix + '.csv', 'w') as csv_file:
        # writer = csv.writer(csv_file)
        # writer.writerow(['x1', 'y1', 'x2', 'y2'])
    rel_annotations = list()

    for x1, y1, x2, y2 in annotations:
        # calculate relative coordinates for annotation in slice
        rel_x1 = x1 - x
        rel_y1 = y1 - y
        rel_x2 = x2 - x
        rel_y2 = y2 - y

        rel_annotations.append((rel_x1, rel_y1, rel_x2, rel_y2))

    make_xml(rel_annotations, MODEL_INPUT_WIDTH, MODEL_INPUT_HEIGHT, file_path)

            # draw rectangle to represent annotation
            # draw.rectangle((rel_x1, rel_y1, rel_x2, rel_y2), fill=(255, 0, 0, 50),
            #                outline=(255, 255, 255))  # add annotations

            # save relative coordinates to file
            # writer.writerow([rel_x1, rel_y1, rel_x2, rel_y2])  # write relative bounds to file

    # save image with annotation drawn
    # image = Image.alpha_composite(image, overlay)
    image.save(f'{file_path}.png')

# close resources
mosaic_dataset.close()
