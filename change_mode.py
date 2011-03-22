'''
Created on 2011-3-8

@author: fuxianrui
Switch the feion mode between product mode and functional mode
'''

fetion_install_dir = r'C:\Program Files\China Mobile\Fetion'
client_cfg_file_names = [r'Client.config', r'ClientFixed.config']
backup_dir = r'C:\Program Files\China Mobile\Fetion\backup'

import os.path
from shutil import copy

def change_fetion_start_mode():
    mode = 0
    dest_file_names = []
    
    for file_name in client_cfg_file_names:
        dest_file_names.append(os.path.join(fetion_install_dir, file_name))
    
    if(os.path.isfile(dest_file_names[0])):
        mode = 1
        print("mode = %s" % mode)
        
    if(mode == 1):
        for dest_file_name in dest_file_names:
            if(os.path.isfile(dest_file_name)):
                os.remove(dest_file_name)
                print("deleting file: %s" % dest_file_name)
    else:
        for src_f_name in client_cfg_file_names:
            src_f_name = os.path.join(backup_dir, src_f_name)
            copy(src_f_name, fetion_install_dir)
            
    print("fetion running in %s" % ((mode == 1 and 'product mode') or 'function mode'))            
    os.execl(os.path.join(fetion_install_dir, 'Fetion.exe'), '1')
    #subprocess.call(os.path.join(fetion_install_dir, 'Fetion.exe'))

if __name__ == '__main__':
    change_fetion_start_mode()