for i,l in enumerate(open(r'D:\simonpeter\CarSimulator\src\vehicles\Car.js')):
    if '_updateGear' in l:
        print(i+1, repr(l))