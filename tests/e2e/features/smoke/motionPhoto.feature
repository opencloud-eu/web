Feature: Motion photo indicator
  As a user
  I want motion photos to be visually marked and playable
  So that I can distinguish them from ordinary photos and watch their clip

  Background:
    Given "Admin" creates following user using API
      | id    |
      | Alice |
    And "Alice" uploads the following local file into personal space using API
      | localFile                | to                       |
      | motionphoto-playable.jpg | motionphoto-playable.jpg |
    And "Alice" logs in
    And "Alice" opens the "files" app


  @motion-photo
  Scenario: motion photo badge is shown in tiles and table view
    # reload so the folder listing is re-fetched after server-side facet extraction
    When "Alice" reloads the page
    And "Alice" switches to the "tiles" view
    Then "Alice" should see the motion photo badge on resource "motionphoto-playable.jpg"
    When "Alice" switches to the "table" view
    Then "Alice" should see the motion photo badge on resource "motionphoto-playable.jpg"
    And "Alice" logs out


  @motion-photo
  Scenario: motion photo badge is shown in the media viewer preview strip
    When "Alice" reloads the page
    And "Alice" opens the following file in mediaviewer
      | resource                 |
      | motionphoto-playable.jpg |
    Then "Alice" should see the motion photo badge in the media viewer for resource "motionphoto-playable.jpg"
    And "Alice" closes the file viewer
    And "Alice" logs out


  @motion-photo
  Scenario: motion photo playback control is shown in the media viewer
    When "Alice" reloads the page
    And "Alice" opens the following file in mediaviewer
      | resource                 |
      | motionphoto-playable.jpg |
    Then "Alice" should see the motion photo control in the media viewer
    And "Alice" closes the file viewer
    And "Alice" logs out


  @motion-photo
  Scenario: motion photo can be played inline from the sidebar
    When "Alice" reloads the page
    And "Alice" plays the motion photo inline from the sidebar for resource "motionphoto-playable.jpg"
    Then "Alice" should see the motion photo clip loaded in the sidebar
    And "Alice" logs out
