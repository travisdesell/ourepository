from PIL import Image, ImageDraw
import math
from random import randint
import numpy as np
import pandas as pd


def rotate(point, radians):
    cos = math.cos(radians)
    sin = math.sin(radians)
    return cos*point[0] - sin*point[1], sin*point[0] + cos*point[1]


def add_item(base, item):
    base_w, base_h = base.size
    avg_dim = (base_w + base_h) / 2
    size = randint(int(avg_dim*0.04), int(avg_dim*0.1))
    angle = randint(0, 360)
    offset = (randint(0, base_w-size), randint(0, base_h-size))

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
    cropBox = (min(non_empty_rows), max(non_empty_rows), min(non_empty_columns), max(non_empty_columns))

    image_data_new = image_data[cropBox[0]:cropBox[1] + 1, cropBox[2]:cropBox[3] + 1, :]

    new_image = Image.fromarray(image_data_new)
    return new_image


def main():
    # im = Image.new('RGBA', (1000, 1000), color=(128, 200, 255))
    im = Image.open("grass.jpg").convert('RGBA')
    item_im = Image.open("butterfly.png")
    df = pd.DataFrame(columns=['x1', 'y1', 'x2', 'y2'])

    for i in range(50):
        im, coords = add_item(im, item_im)
        df.loc[i] = coords

    im.save("test.png")
    df.to_csv('data.csv', index=False, header=True)


if __name__ == '__main__':
    main()
