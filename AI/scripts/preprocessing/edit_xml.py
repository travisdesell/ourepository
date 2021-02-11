from lxml import etree
import os

CURRENT_DIR = os.path.dirname(os.path.abspath(__file__))
TRAIN_IMAGES_DIR = os.path.join(CURRENT_DIR, '../../images/test/train')
TEST_IMAGES_DIR = os.path.join(CURRENT_DIR, '../../images/test/test')


def main():
    for image_dir in [TRAIN_IMAGES_DIR, TEST_IMAGES_DIR]:
        for filename in [f for f in os.listdir(image_dir) if f.endswith('.xml')]:
            full_path = os.path.join(image_dir, filename)
            root = etree.parse(full_path).getroot()

            root.find('folder').text = image_dir.split('/')[-1]
            root.find('path').text = os.path.abspath(os.path.join(image_dir, root.find('filename').text))

            xml_object = etree.tostring(root,
                                        pretty_print=True,
                                        # xml_declaration=True,
                                        encoding='UTF-8')

            with open(full_path, 'wb+') as writer:
                writer.write(xml_object)


if __name__ == '__main__':
    main()

