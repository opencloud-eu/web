Feature: Open an Excalidraw whiteboard
  As a user with the collaborative Excalidraw editor available
  I want to open .excalidraw files
  So that I can draw and collaborate on a shared canvas

  Background:
    Given "Admin" creates following user using API
      | id    |
      | Alice |


  Scenario: open an empty .excalidraw, canvas mounts, realtime connects
    And "Alice" creates the following files into personal space using API
      | pathToFile     | content                                                                            |
      | blank.excalidraw | {"type":"excalidraw","version":2,"source":"test","elements":[],"appState":{},"files":{}} |
    When "Alice" logs in
    And "Alice" opens file "blank.excalidraw" via "excalidraw" using the context menu
    Then "Alice" should see the realtime collab status "connected"
    And "Alice" should see the excalidraw canvas mounted
    And "Alice" should see 0 elements in the excalidraw scene
    And "Alice" logs out


  Scenario: open an .excalidraw with pre-seeded shapes, the scene hydrates from the file
    And "Alice" creates the following files into personal space using API
      | pathToFile        | content                                                                                                                                                                                                                                                                                                                                              |
      | preseeded.excalidraw | {"type":"excalidraw","version":2,"source":"test","elements":[{"id":"r1","type":"rectangle","x":100,"y":100,"width":200,"height":100,"angle":0,"strokeColor":"#000","backgroundColor":"transparent","fillStyle":"hachure","strokeWidth":1,"strokeStyle":"solid","roughness":1,"opacity":100,"groupIds":[],"frameId":null,"roundness":null,"seed":1,"version":1,"versionNonce":1,"isDeleted":false,"boundElements":null,"updated":1,"link":null,"locked":false}],"appState":{},"files":{}} |
    When "Alice" logs in
    And "Alice" opens file "preseeded.excalidraw" via "excalidraw" using the context menu
    Then "Alice" should see the realtime collab status "connected"
    And "Alice" should see the excalidraw canvas mounted
    And "Alice" should see at least 1 element in the excalidraw scene
    And "Alice" logs out
