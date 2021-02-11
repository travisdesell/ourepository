from PIL import Image, ImageDraw
import numpy as np
import pandas as pd
import os
import shutil
import click
import sys

from scripts.util.progress_bar import progressBar
from scripts.util.slice import generate_slice_coords
from scripts.evaluation.model_inference import load_from_saved_model, inference

# Python doesn't like me importing rasterio before tensorflow, so this goes down here
import rasterio as rio
from rasterio.windows import Window

DATA_DIR = os.path.abspath(os.path.join(os.path.dirname(os.path.abspath(__file__)), '../../test'))
OUT_DIR = os.path.abspath(os.path.join(os.path.dirname(os.path.abspath(__file__)), '../../images/inference',
                                       DATA_DIR.split('\\')[-1]))

# DATA_DIR = os.path.abspath(os.path.join(os.path.dirname(os.path.abspath(__file__)), '../../original-data'))
# CARIBOU_DIR = os.path.abspath(os.path.join(DATA_DIR, 'caribou'))
# OUT_DIR = os.path.abspath(os.path.join(CARIBOU_DIR, 'inference'))  # TODO change

# # check whether the output directory exists
# if os.path.exists(OUT_DIR):
#     # check whether slice creation should start from the beginning
#     if click.confirm('Do you want to remove existing output?'):
#         shutil.rmtree(OUT_DIR)
#         os.makedirs(OUT_DIR)
#     else:
#         sys.exit(1)
#         # # check whether slice creation should continue from where it left off
#         # if click.confirm('Do you want to continue from where you left off?'):
#         #     CONTINUE_CHECKPOINT = True
#         # else:
#         #     # if the user does not want to delete existing output and does not want to continue from where it left
#         #     # off, exit program
#         #     sys.exit(1)
# else:
#     # create output directory if it does not yet exist
#     os.makedirs(OUT_DIR)

# Training Specs
MODEL_INPUT_HEIGHT = 640  # TODO must this be same as model?
MODEL_INPUT_WIDTH = 640

assert MODEL_INPUT_HEIGHT == MODEL_INPUT_WIDTH  # TODO necessary?

# how far to move sliding window for each slice
STRIDE_LENGTH = MODEL_INPUT_HEIGHT

# IMAGE_FILENAME = os.path.join(DATA_DIR, '20160718_camp_gm_02_75m_transparent_mosaic_group1.tif')
# CSV_FILENAME = os.path.join(DATA_DIR, 'test.csv')
IMAGE_FILENAME = os.path.join(DATA_DIR, 'test.png')
CSV_FILENAME = os.path.join(DATA_DIR, 'test.csv')

# load in tif mosaic
mosaic_dataset = rio.open(IMAGE_FILENAME)

MOSAIC_WIDTH = mosaic_dataset.width
MOSAIC_HEIGHT = mosaic_dataset.height

# create dataframe containing annotation data
annotations_df = pd.read_csv(CSV_FILENAME, comment='#')

slice_coords_dict = generate_slice_coords(MOSAIC_WIDTH, MOSAIC_HEIGHT, MODEL_INPUT_WIDTH, MODEL_INPUT_WIDTH,
                                          STRIDE_LENGTH, annotations_df)

# TODO remove
# remove all slices without an annotation (performed here to make progress bar more accurate)
slice_coords_dict_all = slice_coords_dict
slice_coords_dict = {coord: annotations for (coord, annotations) in slice_coords_dict.items() if len(annotations) > 0}
percent_containing_annotations = 100 * len(slice_coords_dict) / len(slice_coords_dict_all)
print(f'{round(percent_containing_annotations, 2)}% of all slices contain annotations')

detect_fn, category_index = load_from_saved_model()

# loop over slices
# for coord in slice_coords_dict: TODO maybe put back
for coord in progressBar(slice_coords_dict, prefix='Progress:', suffix='Complete', length=50):
    x, y = coord  # top left corner for this slice
    filename_prefix = f'sample_{x}_{y}'  # name of file without extension

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

        # # concatenate bands along new RGBA axis
        # sample = np.concatenate([sample_red, sample_green, sample_blue], axis=2)
        #
        # # create image
        # image = Image.fromarray(sample, mode='RGB')  # create image

        # annotate image
        overlay = Image.new('RGBA', image.size, (0, 0, 0, 0))
        draw = ImageDraw.Draw(overlay)  # create Draw object

        filepath = f'{OUT_DIR}/{filename_prefix}'  # full filepath of output files excluding extension
        # with open(filename_prefix + '.csv', 'w') as csv_file:
        # writer = csv.writer(csv_file)
        # writer.writerow(['x1', 'y1', 'x2', 'y2'])
        rel_annotations = list()

        ###############################################################################################################
        annotations = slice_coords_dict[coord]  # annotations for this slice
        overlay_data = (annotations, x, y)
        image = image.convert('RGB')
        inference(image, detect_fn, category_index, overlay_data)

        # TODO INFERENCE ANNOTATIONS FOR THIS SLICE
        ###############################################################################################################

        # # iterate over all annotations in slice
        # for x1, y1, x2, y2 in annotations:
        #     # calculate relative coordinates for annotation in slice
        #     rel_x1 = x1 - x
        #     rel_y1 = y1 - y
        #     rel_x2 = x2 - x
        #     rel_y2 = y2 - y
        #
        #     rel_annotations.append((rel_x1, rel_y1, rel_x2, rel_y2))
        #
        #     # draw rectangle to represent annotation
        #     draw.rectangle((rel_x1, rel_y1, rel_x2, rel_y2), fill=(255, 0, 0, 50),
        #                    outline=(255, 255, 255))  # add annotations
        #
        # # save relative coordinates to file
        # # writer.writerow([rel_x1, rel_y1, rel_x2, rel_y2])  # write relative bounds to file
        #
        # # Save image. Uncomment next line to add annotation overlay to image.
        # image = Image.alpha_composite(image, overlay)
        # image_path = filepath + '.png'
        # image.save(image_path)
        #
        # # retry if saved image is corrupt
        # if cv2.imread(image_path) is None:
        #     retry += 1
        # else:
        #     retry -= 1
        retry -= 1  # TODO remove

# close resources
mosaic_dataset.close()
