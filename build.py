import shutil
import threading
import os
from progress.spinner import Spinner

def compile_func():
    print("Creating an optimised build of React Motion Router ⚛\n")
    # typescript build

    os.system('tsc')
    return False

def copy_assets():
    print("Copying CSS files\n")
    try:
        os.remove('./build/README.md')
    except:
        pass
    try:
        shutil.rmtree('./build/css')
    except:
        pass
        
    # copy css
    source = "./src/css"
    destination = "./build/css"

    shutil.copytree(source, destination)

    #copy README.md
    source = "./README.md"
    destination = "./build"

    shutil.copy(source, destination)
    return False


def clear():
    # for windows
    if os.name == 'nt':
        _ = os.system('cls')
  
    # for mac and linux(here, os.name is 'posix')
    else:
        _ = os.system('clear')


def load_func(message):
    spinner = Spinner(message)
    while True:
        # Do some work
        spinner.next()

def main():
    clear()
    load = threading.Thread(target=load_func, args=('Compiling ',))
    # load.start()
    compile_func()
    # load.join(5)

    clear()

    load = threading.Thread(target=load_func, args=('Copying assets ',))
    # load.start()
    copy_assets()
    # load.join(5)

    clear()
    print("Done!")
    exit(0)


main()



