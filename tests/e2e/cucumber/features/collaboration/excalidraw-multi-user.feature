Feature: Multi-user collaboration on an Excalidraw whiteboard
  As two users editing the same whiteboard
  I want the scene to stay in sync across tabs via the y-excalidraw binding
  So that we can collaborate without bumping into each other's edits

  Background:
    Given "Admin" creates following user using API
      | id    |
      | Alice |
      | Brian |


  Scenario: a shape that Alice creates appears in Brian's scene
    # Pre-seeded with one rectangle so we can assert the file content+
    # binding wiring on initial load, then watch for the count to grow
    # once Alice draws another shape. Alice's drawing simulated via the
    # imperative API (see step) rather than actually clicking and dragging
    # on the canvas — canvas pointer interaction in Playwright is brittle.
    And "Alice" creates the following files into personal space using API
      | pathToFile          | content                                                                                                                                                                                                                                                                                                                                              |
      | shared.excalidraw   | {"type":"excalidraw","version":2,"source":"test","elements":[{"id":"r1","type":"rectangle","x":100,"y":100,"width":200,"height":100,"angle":0,"strokeColor":"#000","backgroundColor":"transparent","fillStyle":"hachure","strokeWidth":1,"strokeStyle":"solid","roughness":1,"opacity":100,"groupIds":[],"frameId":null,"roundness":null,"seed":1,"version":1,"versionNonce":1,"isDeleted":false,"boundElements":null,"updated":1,"link":null,"locked":false}],"appState":{},"files":{}} |
    And "Alice" shares the following resource using API
      | resource          | recipient | type | role     |
      | shared.excalidraw | Brian     | user | Can edit |
    When "Alice" logs in
    And "Alice" opens file "shared.excalidraw" via "excalidraw" using the context menu
    Then "Alice" should see the realtime collab status "connected"
    And "Alice" should see the excalidraw canvas mounted
    And "Alice" should see at least 1 element in the excalidraw scene
    And "Brian" logs in
    And "Brian" navigates to the shared with me page
    And "Brian" opens file "shared.excalidraw" via "excalidraw" using the context menu
    Then "Brian" should see the realtime collab status "connected"
    And "Brian" should see the excalidraw canvas mounted
    And "Brian" should see at least 1 element in the excalidraw scene
    When "Alice" adds a rectangle to the excalidraw scene via the API
    Then "Brian" should see at least 2 elements in the excalidraw scene
    And "Alice" logs out
    And "Brian" logs out
