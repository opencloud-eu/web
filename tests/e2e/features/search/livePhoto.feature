Feature: Live photo indicator
  As a user
  I want live photos to be visually marked and playable
  So that I can distinguish them from ordinary photos and watch their video

  Background:
    Given "Admin" creates following user using API
      | id    |
      | Alice |
    And "Alice" creates the following folder in personal space using API
      | name   |
      | videos |
    And "Alice" uploads the following local file into personal space using API
      | localFile     | to                   |
      | livephoto.jpg | livephoto.jpg        |
      | livephoto.mov | videos/livephoto.mov |
    And "Alice" waits for the live photo facet of file "livephoto.jpg" using API
    And "Alice" waits for the live photo facet of file "videos/livephoto.mov" using API
    And "Alice" logs in
    And "Alice" opens the "files" app


  @live-photo
  Scenario: live photo badge is shown in tiles and table view
    When "Alice" switches to the "tiles" view
    Then "Alice" should see the motion photo badge on resource "livephoto.jpg"
    When "Alice" switches to the "table" view
    Then "Alice" should see the motion photo badge on resource "livephoto.jpg"
    And "Alice" logs out


  @live-photo
  Scenario: live photo badge is shown in the media viewer preview strip
    When "Alice" opens the following file in mediaviewer
      | resource      |
      | livephoto.jpg |
    Then "Alice" should see the motion photo badge in the media viewer for resource "livephoto.jpg"
    And "Alice" closes the file viewer
    And "Alice" logs out


  @live-photo
  Scenario: live photo playback control is shown in the media viewer
    When "Alice" opens the following file in mediaviewer
      | resource      |
      | livephoto.jpg |
    Then "Alice" should see the motion photo control in the media viewer
    And "Alice" closes the file viewer
    And "Alice" logs out


  @live-photo
  Scenario: live photo plays the paired video of another folder inline from the sidebar
    When "Alice" plays the motion photo inline from the sidebar for resource "livephoto.jpg"
    Then "Alice" should see the motion photo video loaded in the sidebar
    And "Alice" logs out
