/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable @typescript-eslint/no-unsafe-member-access */
/* eslint-disable @typescript-eslint/no-unsafe-assignment */

/* eslint-disable @typescript-eslint/no-unsafe-call */
/* eslint-disable @typescript-eslint/no-unsafe-argument */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { MindMapController } from '../../src/presentation/MindMapController';
import { MindMap } from '../../src/domain/entities/MindMap';
import { Node } from '../../src/domain/entities/Node';
import { MindMapService } from '../../src/application/MindMapService';
import { SvgRenderer } from '../../src/presentation/SvgRenderer';
import { StyleEditor } from '../../src/presentation/StyleEditor';
import { InteractionHandler } from '../../src/presentation/InteractionHandler';
import { CryptoIdGenerator } from '../../src/infrastructure/CryptoIdGenerator';

// Mock dependencies
vi.mock('../../src/application/MindMapService');
vi.mock('../../src/presentation/SvgRenderer');
vi.mock('../../src/presentation/StyleEditor');
vi.mock('../../src/presentation/InteractionHandler');

describe('MindMapController', () => {
  let controller: MindMapController;
  let mindMap: MindMap;
  let service: any; // Using any for mocked instance
  let renderer: any;
  let styleEditor: any;
  let interactionHandler: any;
  let eventBus: any;
  let rootNode: Node;

  beforeEach(() => {
    rootNode = new Node('root', 'Root');
    mindMap = new MindMap(rootNode);

    // Instantiate mocks
    const idGenerator = new CryptoIdGenerator();
    service = new MindMapService(mindMap, idGenerator);
    renderer = new SvgRenderer(document.createElement('div'));
    styleEditor = new StyleEditor(document.createElement('div'));
    interactionHandler = new InteractionHandler(document.createElement('div'), {} as any);

    eventBus = {
      emit: vi.fn() as any,
    };

    // Fix renderer container for ensureNodeVisible and other layout logic
    const mockContainer = document.createElement('div');
    Object.defineProperty(mockContainer, 'clientWidth', { value: 1000 });
    Object.defineProperty(mockContainer, 'clientHeight', { value: 800 });
    // Mock getBoundingClientRect
    mockContainer.getBoundingClientRect = () =>
      ({
        left: 0,
        top: 0,
        width: 1000,
        height: 800,
        right: 1000,
        bottom: 800,
      }) as DOMRect;
    // Mock querySelector
    mockContainer.querySelector = vi.fn().mockImplementation(() => {
      return {
        getBoundingClientRect: () =>
          ({ left: 10, top: 10, width: 100, height: 50, right: 110, bottom: 60 }) as DOMRect,
      };
    });

    renderer.container = mockContainer;
    renderer.render = vi.fn();
    renderer.updateTransform = vi.fn();

    controller = new MindMapController(mindMap, service, renderer, styleEditor, eventBus);

    // Wire up InteractionHandler
    controller.setInteractionHandler(interactionHandler);

    // Reset service mocks return values
    service.addNode.mockReset();
    service.removeNode.mockReset();
  });

  it('init should set initial pan and start loop', () => {
    controller.init(1000);
    expect(renderer.container.clientWidth).toBe(1000);
    // init sets pan to 0.2 * width = 200
    expect(controller['panX']).toBe(200);
  });

  it('addNode should call service and emit events', () => {
    const newNode = new Node('new1', 'New Node');
    service.addNode.mockReturnValue(newNode);

    const result = controller.addNode('root', 'New Node');

    expect(service.addNode).toHaveBeenCalledWith('root', 'New Node', undefined);
    expect(renderer.render).toHaveBeenCalled();
    expect(eventBus.emit).toHaveBeenCalledWith('node:add', { id: 'new1', topic: 'New Node' });
    expect(eventBus.emit).toHaveBeenCalledWith('model:change', undefined);
    expect(result).toBe(newNode);
  });

  it('addChildNode (interaction) should add node and start editing', () => {
    const newNode = new Node('child1', 'Child');
    service.addNode.mockReturnValue(newNode);

    controller.addChildNode('root');

    // Interaction specific: emitChange should be false initially (pending creation)
    expect(service.addNode).toHaveBeenCalledWith('root', 'New topic', undefined);
    // Should NOT emit model:change yet (passed emitChange: false)
    expect(eventBus.emit).not.toHaveBeenCalledWith('model:change', undefined);

    expect(controller['pendingNodeCreation']).toBe(true);
    expect(interactionHandler.editNode).toHaveBeenCalledWith('child1');
    expect(controller['selectedNodeId']).toBe('child1');
  });

  it('deleteNode should call service and emit remove', () => {
    service.removeNode.mockReturnValue(true);
    controller.deleteNode('child1');

    expect(service.removeNode).toHaveBeenCalledWith('child1');
    expect(eventBus.emit).toHaveBeenCalledWith('node:remove', 'child1');
    expect(eventBus.emit).toHaveBeenCalledWith('model:change', undefined);
  });

  it('updateNode should emit node:update and model:change', () => {
    service.updateNodeTopic.mockReturnValue(true);
    controller.updateNode('root', { topic: 'Updated' });

    expect(service.updateNodeTopic).toHaveBeenCalledWith('root', 'Updated');
    expect(eventBus.emit).toHaveBeenCalledWith('node:update', { id: 'root', topic: 'Updated' });
    expect(eventBus.emit).toHaveBeenCalledWith('model:change', undefined);
  });
});
