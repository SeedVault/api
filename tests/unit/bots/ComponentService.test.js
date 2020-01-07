import {
  ComponentService, ComponentNotFoundError, ForbiddenComponentError,
} from '../../../lib/bots/services/ComponentService';
import ValidationError from 'mongoose/lib/error/validation';
import { common } from '../common';

describe('Components', () => {

  it('should create a valid component', async () => {
    const user = await common.createAndVerifyJohnDoe();
    const component = await common.createComponent('chatscript', 'botengine', user);
    expect(component).toHaveProperty('_id');
    const savedComponent = await ComponentService.findComponentById(component._id, user.id);
    expect(savedComponent.name).toBe(component.name);
  });

  it('should throw validation errors when passed empty data', async () => {
    await expect(
      ComponentService.createComponent({})
    ).rejects.toThrowError(ValidationError);
  });

  it('should throw a validation error when the component name is already in use', async () => {
    const user = await common.createAndVerifyJohnDoe();
    await common.createComponent('chatscript', 'botengine', user);
    let component = await common.getEmptyComponent('chatscript', 'botengine', user);
    await expect(
      ComponentService.createComponent(component, 'botengine')
    ).rejects.toThrow(/domain.component.validation.unique_name/);
    expect(component.name).toBe('chatscript');
  });

  it('should throw a "component not found" error when passed a wrong component id', async () => {
    await expect(
      ComponentService.findComponentById()
    ).rejects.toThrowError(ComponentNotFoundError);
  });

  it('should update a valid component', async () => {
    const user = await common.createAndVerifyJohnDoe();
    const component = await common.createComponent('chatscript', 'botengine', user);
    expect(component).toHaveProperty('_id');
    const id = component._id;
    let savedComponent = await ComponentService.findComponentById(id);
    savedComponent.name = 'MyNewName';
    const updatedComponent = await ComponentService.updateComponent(savedComponent, user._id);
    expect(updatedComponent.name).toBe('MyNewName');
  });

  it('should throw a "forbidden component" error when trying to update a component that doesn\'t belong to me', async () => {
    const component = await common.createComponent('chatscript', 'botengine');
    expect(component).toHaveProperty('_id');
    const id = component._id;
    await ComponentService.findComponentById(id);
    component.name = 'MyNewName';
    await expect(
      ComponentService.updateComponent(component, 'notmine')
      ).rejects.toThrowError(ForbiddenComponentError);
  });

  it('should change the picture of a component', async () => {
    const user = await common.createAndVerifyJohnDoe();
    const component = await common.createComponent('chatscript', 'botengine', user);
    expect(component).toHaveProperty('_id');
    expect(component.pictureUrl).toBe(`${process.env.VUE_APP_GREENHOUSE_URL}/images/component-default.png`);
    const id = component._id;
    component.picture = '12345678.jpg';
    await ComponentService.updateComponent(component, user._id);
    const savedComponent = await ComponentService.findComponentById(id);
    expect(savedComponent.pictureUrl).toBe(`${process.env.VUE_APP_CDN_URL}/greenhouse-components/12345678.jpg`);
  });

  it('should retrieve components in an array of ids', async () => {
    const user = await common.createAndVerifyJohnDoe();
    const one = await common.createComponent('one', 'botengine', user);
    const two = await common.createComponent('two', 'botengine', user);
    await common.createComponent('three', 'botengine', user);
    const results = await ComponentService.findComponentsWithIdInArray([one._id, two._id]);
    expect(results.length).toBe(2);
  });

  it('should delete a component that belongs to me', async () => {
    const user = await common.createAndVerifyJohnDoe();
    const component = await common.createComponent('chatscript', 'botengine', user);
    expect(component).toHaveProperty('_id');
    const id = component._id;
    const value = await ComponentService.deleteComponentById(id, user._id);
    expect(value.deletedCount).toBe(1);
    await expect(
      ComponentService.deleteComponentById(id, user._id)
    ).rejects.toThrowError(ComponentNotFoundError);
  });

  it('should throw a "forbidden component" error when trying to delete a component that doesn\'t belong to me', async () => {
    const user = await common.createAndVerifyJohnDoe();
    const component = await common.createComponent('chatscript', 'botengine', user);
    expect(component).toHaveProperty('_id');
    const id = component._id;
    await expect(
      ComponentService.deleteComponentById(id, 'notmine')
      ).rejects.toThrowError(ForbiddenComponentError);
  });

  it('should retrieve paginated results', async () => {
    const user = await common.createAndVerifyJohnDoe();
    const anotherUser = await common.createAndVerifyUser('another@user.com', 'anotheruser');
    await common.createComponent('one', 'botengine', user);
    await common.createComponent('two', 'botengine', user);
    await common.createComponent('three', 'botengine', user);
    await common.createComponent('four', 'botengine', user);
    await common.createComponent('five', 'botengine', anotherUser);
    const resultsPageOne = await ComponentService.findPaginatedComponents(3, 1, user._id, '', '', '', 'name', 'asc', '');
    expect(resultsPageOne.results.length).toBe(3);
    expect(resultsPageOne.resultsCount).toBe(4);
    expect(resultsPageOne.currentPage).toBe(1);
    expect(resultsPageOne.pagesCount).toBe(2);
    const resultsPageTwo = await ComponentService.findPaginatedComponents(3, 2, user._id, '', '', '', 'name', 'asc', '');
    expect(resultsPageTwo.results.length).toBe(1);
    expect(resultsPageTwo.resultsCount).toBe(4);
    expect(resultsPageTwo.currentPage).toBe(2);
    expect(resultsPageTwo.pagesCount).toBe(2);
  });

  it('should filter results by username, search text, component type and status', async () => {
    const user = await common.createAndVerifyJohnDoe();
    const anotherUser = await common.createAndVerifyUser('another@user.com', 'anotheruser');
    await common.createComponent('one', 'botengine', user);
    await common.createComponent('two', 'botengine', user);
    await common.createComponent('three', 'botengine', user);
    const four = await common.createComponent('four', 'botengine', anotherUser);
    four.status = 'disabled';
    await ComponentService.updateComponent(four, anotherUser._id);
    // username
    let rows = await ComponentService.findPaginatedComponents(3, 1, user._id, '', '', '', 'name', 'asc', '');
    expect(rows.results.length).toBe(3);
    rows = await ComponentService.findPaginatedComponents(3, 1, anotherUser._id, '', '', 'disabled', 'name', 'asc', '');
    expect(rows.results.length).toBe(1);
    rows = await ComponentService.findPaginatedComponents(3, 1, '5e0ccf2d8cb3354a76bf0b4b', '', '', '', 'name', 'asc', '');
    expect(rows.results.length).toBe(0);
    // Component type
    rows = await ComponentService.findPaginatedComponents(3, 1, '', '', 'botengine', 'enabled', 'name', 'asc', '');
    expect(rows.results.length).toBe(3);
    // Status
    rows = await ComponentService.findPaginatedComponents(3, 1, '', '', '', 'disabled', 'name', 'asc', '');
    expect(rows.results.length).toBe(1);
    // search
    rows = await ComponentService.findPaginatedComponents(3, 1, user._id, 'three', '', '', 'name', 'asc', '');
    expect(rows.results.length).toBe(1);
  });

});
