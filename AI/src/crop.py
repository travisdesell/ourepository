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

DATA_DIR = os.path.join(os.path.dirname(os.path.abspath(__file__)), '../data')
CARIBOU_DIR = os.path.join(DATA_DIR, 'caribou')
OUT_DIR = os.path.join(CARIBOU_DIR, 'out')
CONTINUE_CHECKPOINT = False

# if os.path.exists(OUT_DIR):
#     if click.confirm('Do you want to continue from last saved slice?'):
#         CONTINUE_CHECKPOINT = True
#     else:
#         if click.confirm('Are you sure you want to remove existing output?'):
#             shutil.rmtree(OUT_DIR)
#             os.makedirs(OUT_DIR)
# else:
#     os.makedirs(OUT_DIR)

CARIBOU_IMAGE_FILENAME = os.path.join(CARIBOU_DIR, '20160718_camp_gm_02_75m_transparent_mosaic_group1.tif')
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

for coord in slice_coords_list:
    x = coord[0]
    y = coord[1]

    # get all annotations in slice
    annotations_in_slice_df = annotations_df.loc[
                              ((x <= annotations_df['x1']) & (annotations_df['x1'] < x+MODEL_INPUT_WIDTH)) &
                              ((x <= annotations_df['x2']) & (annotations_df['x2'] < x+MODEL_INPUT_WIDTH)) &
                              ((y <= annotations_df['y1']) & (annotations_df['y1'] < y+MODEL_INPUT_HEIGHT)) &
                              ((y <= annotations_df['y2']) & (annotations_df['y2'] < y+MODEL_INPUT_HEIGHT))]

    if annotations_in_slice_df.empty:
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

    # annotate
    image = Image.fromarray(sample, mode='RGBA')  # create image
    overlay = Image.new('RGBA', image.size, (0, 0, 0, 0))
    draw = ImageDraw.Draw(overlay) # create Draw object

    with open(f'{OUT_DIR}/sample_{x}_{y}.csv', 'w') as csv_file:
        writer = csv.writer(csv_file)
        writer.writerow(['x1', 'y1', 'x2', 'y2'])

        for row in annotations_in_slice_df.itertuples():
            rel_x1 = row.x1 - x
            rel_y1 = row.y1 - y
            rel_x2 = row.x2 - x
            rel_y2 = row.y2 - y

            draw.rectangle((rel_x1, rel_y1, rel_x2, rel_y2), fill=(255, 0, 0, 50),
                           outline=(255, 255, 255))  # add annotations
            writer.writerow([rel_x1, rel_y1, rel_x2, rel_y2])  # write relative bounds to file

    image = Image.alpha_composite(image, overlay)
    image.save(f'{OUT_DIR}/sample_{x}_{y}.png')

# close resources
mosaic_dataset.close()
