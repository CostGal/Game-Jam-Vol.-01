Unremembered - game jam build (portrait, touch)

Static files: serve this folder with any web server and open index.html
(it does not work from file:// because the browser blocks module scripts there).
thumb.jpg is the 1280x720 thumbnail.

Embedding: the iframe should carry  allow="autoplay; fullscreen"  so the sound
starts on the player's first tap. The game has no fullscreen button of its own
and opens no new tabs. UI is kept clear of the top-right 60x60 px corner (the
host page's button).
