Feature: Work with an rclone-crypt encrypted vault
  As a user with rclone-crypt-encrypted folders on the server
  I want to browse, edit and upload through OpenCloud Web under cleartext names
  So that I can work with my encrypted files without decrypting them manually

  @rclone-crypt
  Scenario: Browse a vault and see decrypted folder/file names
    Given "Admin" creates an rclone-crypt vault "myvault.vault" in personal space with the following content
      | path           | content              |
      | hello.txt      | hello world          |
      | sub/nested.txt | nested file content  |
    When "Admin" logs in
    And "Admin" navigates to the personal space page
    Then following resources should be displayed in the files list for user "Admin"
      | resource      |
      | myvault.vault |
    When "Admin" enters the vault "myvault.vault" with passphrase "foobar"
    Then following resources should be displayed in the files list for user "Admin"
      | resource  |
      | hello.txt |
      | sub       |
    When "Admin" opens folder "sub"
    Then following resources should be displayed in the files list for user "Admin"
      | resource   |
      | nested.txt |
    When "Admin" opens the following file in texteditor
      | resource   |
      | nested.txt |
    Then "Admin" should see the text editor content "nested file content"

    When "Admin" replaces the text editor content with "rewritten through the vault"
    And "Admin" saves the text editor file
    Then the rclone-crypt vault "myvault.vault" file "sub/nested.txt" should decrypt to "rewritten through the vault"

  @rclone-crypt
  Scenario: Upload a file into a vault encrypts it on the server
    Given "Admin" creates an rclone-crypt vault "myvault.vault" in personal space with the following content
      | path           | content              |
      | hello.txt      | hello world          |
      | sub/nested.txt | nested file content  |
    When "Admin" logs in
    And "Admin" navigates to the personal space page
    And "Admin" enters the vault "myvault.vault" with passphrase "foobar"
    And "Admin" opens folder "sub"
    And "Admin" uploads a file named "uploaded.txt" with content "freshly uploaded content" via the upload button
    Then following resources should be displayed in the files list for user "Admin"
      | resource     |
      | nested.txt   |
      | uploaded.txt |
    And the rclone-crypt vault "myvault.vault" file "sub/uploaded.txt" should decrypt to "freshly uploaded content"

  @rclone-crypt
  Scenario: Drag-drop a directory tree into a vault
    Given "Admin" creates an rclone-crypt vault "myvault.vault" in personal space with the following content
      | path      | content     |
      | hello.txt | hello world |
    When "Admin" logs in
    And "Admin" navigates to the personal space page
    And "Admin" enters the vault "myvault.vault" with passphrase "foobar"
    And "Admin" drag-drop uploads the following directory tree
      | path                       | content        |
      | mybundle/inner.txt         | inner content  |
      | mybundle/deeper/nested.txt | deeper content |
    Then the rclone-crypt vault "myvault.vault" file "mybundle/inner.txt" should decrypt to "inner content"
    And the rclone-crypt vault "myvault.vault" file "mybundle/deeper/nested.txt" should decrypt to "deeper content"

  @rclone-crypt
  Scenario: Create a vault, set a passphrase and upload an encrypted file
    Given "Admin" removes any folder "freshvault.vault" on the server
    When "Admin" logs in
    And "Admin" navigates to the personal space page
    And "Admin" creates the following resources
      | resource         | type   |
      | freshvault.vault | folder |
    And "Admin" enters the vault "freshvault.vault" with passphrase "foobar"
    And "Admin" uploads a file named "secret.txt" with content "top secret content" via the upload button
    Then following resources should be displayed in the files list for user "Admin"
      | resource   |
      | secret.txt |
    And the rclone-crypt vault "freshvault.vault" file "secret.txt" should decrypt to "top secret content"

  @rclone-crypt
  Scenario: A wrong passphrase is rejected
    Given "Admin" creates an rclone-crypt vault "myvault.vault" in personal space with the following content
      | path      | content     |
      | hello.txt | hello world |
    When "Admin" logs in
    And "Admin" navigates to the personal space page
    And "Admin" fails to enter the vault "myvault.vault" with the wrong passphrase "definitely-wrong"

  @rclone-crypt
  Scenario: A vault root is collaborator-shareable but not public-linkable, its content stays private
    Given "Admin" creates an rclone-crypt vault "myvault.vault" in personal space with the following content
      | path      | content     |
      | hello.txt | hello world |
    When "Admin" logs in
    And "Admin" navigates to the personal space page
    Then "Admin" should be able to share "myvault.vault" but not create a public link
    When "Admin" enters the vault "myvault.vault" with passphrase "foobar"
    Then "Admin" should not be able to share "hello.txt"

  @rclone-crypt
  Scenario: Rename and download a vault file
    Given "Admin" creates an rclone-crypt vault "myvault.vault" in personal space with the following content
      | path      | content           |
      | hello.txt | downloadable text |
    When "Admin" logs in
    And "Admin" navigates to the personal space page
    And "Admin" enters the vault "myvault.vault" with passphrase "foobar"
    And "Admin" renames the vault resource "hello.txt" to "renamed.txt"
    Then following resources should be displayed in the files list for user "Admin"
      | resource    |
      | renamed.txt |
    And the rclone-crypt vault "myvault.vault" file "renamed.txt" should decrypt to "downloadable text"
    And "Admin" downloads the vault file "renamed.txt" which decrypts to "downloadable text"

  @rclone-crypt
  Scenario: A collaborator-shared vault root unlocks and decrypts for the receiver
    Given "Admin" creates following users using API
      | id    |
      | Brian |
    And "Admin" creates an rclone-crypt vault "myvault.vault" in personal space with the following content
      | path      | content     |
      | hello.txt | hello world |
    And "Admin" shares the rclone-crypt vault "myvault.vault" with "Brian" via API
    When "Brian" logs in
    And "Brian" navigates to the shared with me page
    And "Brian" enters the vault "myvault.vault" with passphrase "foobar"
    Then following resources should be displayed in the files list for user "Brian"
      | resource  |
      | hello.txt |
