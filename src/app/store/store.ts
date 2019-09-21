import { uuidv4 } from 'uuid';

class Store {
  private readonly onSet: (id: string, element: any) => void;
  private readonly elements: {
    [id: string]: any;
  };

  constructor(
    elements: {
      [id: string]: any;
    },
    onSet: (id: string, element: any) => void
  ) {
    this.elements = elements;
    this.onSet = onSet;
  }

  add(element: any): number {
    const id = uuidv4();
    this.elements[id] = element;
    this.onSet(id, element);
    return id;
  }

  get(id: string): any {
    return this.elements[id];
  }
}
