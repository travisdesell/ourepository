from PIL import Image
from random import randint
import numpy as np
import pandas as pd
import os
import shutil


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
    im = Image.open('grass.jpg').convert('RGBA')
    item_im = Image.open('butterfly.png')
    df = pd.DataFrame(columns=['x1', 'y1', 'x2', 'y2'])
    label = 'butterfly'

    for i in range(50):
        im, coords = add_item(im, item_im)
        df.loc[i] = coords

    # create clean output directory
    output_dir = 'test/'
    if os.path.exists(output_dir):
        shutil.rmtree(output_dir)
    os.makedirs(output_dir)

    im.save('test/test.png')
    df.to_csv('test/test.csv', index=False, header=True)

    with open('test/test.csv', 'r+') as f:
        content = f.read()
        f.seek(0, 0)
        f.write(f'#label: {label}\n'+content)


if __name__ == '__main__':
    main()
