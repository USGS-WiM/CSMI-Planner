import { TestBed } from '@angular/core/testing';

import { SiglService } from './sigl.service';

describe('SiglService', () => {
  beforeEach(() => TestBed.configureTestingModule({}));

  it('should be created', () => {
    const service: SiglService = TestBed.get(SiglService);
    expect(service).toBeTruthy();
  });
});
