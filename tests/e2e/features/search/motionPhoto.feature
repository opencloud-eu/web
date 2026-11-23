Feature: Motion photo indicator
  As a user
  I want motion photos to be visually marked and playable
  So that I can distinguish them from ordinary photos and watch their video

  Background:
    Given "Admin" creates following user using API
      | id    |
      | Alice |
    And "Alice" uploads the following local file into personal space using API
      | localFile                | to                       |
      | motionphoto-playable.jpg | motionphoto-playable.jpg |
    And "Alice" waits for the motion photo facet of file "motionphoto-playable.jpg" using API
    And "Alice" logs in
    And "Alice" opens the "files" app

  Scenario: motion photo is marked and its embedded video plays
    When "Alice" switches to the "tiles" view
    Then "Alice" should see the motion photo badge on resource "motionphoto-playable.jpg"
    When "Alice" switches to the "table" view
    Then "Alice" should see the motion photo badge on resource "motionphoto-playable.jpg"
    When "Alice" opens the following file in mediaviewer
      | resource                 |
      | motionphoto-playable.jpg |
    Then "Alice" should see the motion photo badge in the media viewer for resource "motionphoto-playable.jpg"
    And "Alice" should see the motion photo control in the media viewer
    When "Alice" closes the file viewer
    And "Alice" plays the motion photo inline from the sidebar for resource "motionphoto-playable.jpg"
    Then "Alice" should see the motion photo video loaded in the sidebar
    And "Alice" logs out
