"""
Generate a (relatively) small test image with randomized objects along with their annotation.
Output the image and a CSV for each of the labels.

"""

__author__ = 'David Dunlap'

import logging

from PIL import Image
from random import randint
import numpy as np
import pandas as pd
import os
import shutil

from scripts.util.file_utils import full_path, create_directory_if_not_exists

logger = logging.getLogger(__name__)


def add_item(base, item):
    """
    Adds a new item on top of the base image. The item will have a random scale, rotation, and location.
    :param base: The base image
    :param item: The template item image
    :return: Tuple containing the base image with the item appended, and the coordinates of where the item was placed
    """

    # Generate random values for scale, rotation, and location
    base_w, base_h = base.size
    avg_dim = (base_w + base_h) / 2
    size = randint(int(avg_dim*0.04), int(avg_dim*0.1))
    angle = randint(0, 360)
    offset = (randint(0, base_w-size), randint(0, base_h-size))

    # Apply the transformations
    item_asp_ratio = item.size[0] / item.size[1]
    new_im = item.resize((int(size * item_asp_ratio), size))
    new_im = new_im.rotate(angle, expand=True)
    new_im = crop(new_im)
    base.alpha_composite(new_im, dest=offset)

    coords = (offset[0], offset[1], offset[0]+new_im.size[0], offset[1]+new_im.size[1])
    return base, coords


def crop(pil_image):
    """
    Crops the image to remove unnecessary transparent parts created when a non-square image is rotated
    """

    image_data = np.asarray(pil_image)
    image_data_bw = image_data.max(axis=2)
    non_empty_columns = np.where(image_data_bw.max(axis=0) > 0)[0]
    non_empty_rows = np.where(image_data_bw.max(axis=1) > 0)[0]
    crop_box = (min(non_empty_rows), max(non_empty_rows), min(non_empty_columns), max(non_empty_columns))

    image_data_new = image_data[crop_box[0]:crop_box[1] + 1, crop_box[2]:crop_box[3] + 1, :]

    new_image = Image.fromarray(image_data_new)
    return new_image


def main():
    image_path = os.path.join(os.path.dirname(__file__), 'grass.jpg')
    im = Image.open(image_path).convert('RGBA')
    labels = ['butterfly', 'ladybug']

    data_dir = os.path.join(os.path.dirname(__file__), 'test')
    create_directory_if_not_exists(full_path(data_dir))
    for j in [1, 2]:
        # create clean output directory
        mosaic_dir = os.path.join(data_dir, f'test{j}')
        if os.path.exists(mosaic_dir):
            shutil.rmtree(mosaic_dir)
        create_directory_if_not_exists(full_path(mosaic_dir))

        item_ims = {}
        coords_dfs = {}
        for label in labels:
            image_path = os.path.join(os.path.dirname(__file__), f'{label}.png')
            item_ims[label] = Image.open(image_path)
            coords_dfs[label] = pd.DataFrame(columns=['x1', 'y1', 'x2', 'y2'])

            for j in range(10):
                im, coords = add_item(im, item_ims[label])
                coords_dfs[label].loc[j] = coords

            label_path = os.path.join(mosaic_dir, f'{label}_coords.csv')
            coords_dfs[label].to_csv(label_path, index=False, header=True)
            with open(label_path, 'r+') as f:
                content = f.read()
                f.seek(0, 0)
                f.write(f'#label: {label}\n'+content)

            logger.info(f'Created {full_path(label_path)}')

        image_path = os.path.join(mosaic_dir, 'test.tif')
        im.save(image_path)

        logger.info(f'Created {full_path(image_path)}')


if __name__ == '__main__':
    main()
