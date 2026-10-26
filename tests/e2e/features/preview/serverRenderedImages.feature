Feature: Images the server renders previews for
  As a user
  I want heic and avif photos to show a thumbnail and open in the media viewer
  So that the photos from my phone and camera work like any other image

  Background:
    Given "Admin" creates following user using API
      | id    |
      | Alice |
    And "Alice" uploads the following local file into personal space using API
      | localFile        | to               |
      | samplePhoto.avif | samplePhoto.avif |
      | samplePhoto.heic | samplePhoto.heic |
    And "Alice" logs in
    And "Alice" opens the "files" app


  Scenario: a heic shows a thumbnail and opens in the media viewer
    Then "Alice" should see thumbnail and preview for file "samplePhoto.heic"
    When "Alice" opens the following file in mediaviewer
      | resource         |
      | samplePhoto.heic |
    Then "Alice" is in a media-viewer
    And "Alice" closes the file viewer
    And "Alice" logs out


  Scenario: an avif shows a thumbnail and opens in the media viewer
    Then "Alice" should see thumbnail and preview for file "samplePhoto.avif"
    When "Alice" opens the following file in mediaviewer
      | resource         |
      | samplePhoto.avif |
    Then "Alice" is in a media-viewer
    And "Alice" closes the file viewer
    And "Alice" logs out
