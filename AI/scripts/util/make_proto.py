def create_label_proto(filename, labels):
    with open(filename, 'w') as f:
        for i in range(len(labels)):
            f.write(create_label_str(i + 1, labels[i]))


def create_label_str(id, name):
    return f"\nitem {{\n    id: {id}\n    name: '{name}'\n}}\n"


filename = 'pb.pbtxt'

if __name__ == '__main__':
    create_label_proto(filename, ['caribou'])