/*
 *	Color Game
 *
 *	author: Anneli Ulsberg
 *	version: 1.0 (2013-05-02)
 *
 */

// Flash WebSocket fallback.
WEB_SOCKET_SWF_LOCATION = '/js/flash_socket/WebSocketMain.swf';


/*
 * GAME
 *
 * The Game class, containing the game logic.
 */
 var Game = {
  'level' : 0,
  'nextRow' : 7,
  'prevRow' : 0,
  'nextStep' : 0,
  'prevStep' : 0,
  'points' : 0,
  'board' : [],
  'instance' : {},
  'interactive' : false,
  'advancing' : false,
  'failed' : false,
  'lastPressed' : null,
  'colors' : ['r', 'g', 'b'],
  'piano' : {},


  /*
   * INITIALIZE
   *
   * Initializes the Game based on its state.
   *
   * @connect 'true' to connect the game to the WebSocket server,
   *          'false' if already connected.
   *
   * @return void
   */
  'initialize' : function(connect, keepBoard) {
    if (connect) {
      Game.connect();

      if (window.MIDI) {
        MIDI.loadPlugin({
          soundfontUrl : "./soundfont/",
          instrument : "acoustic_grand_piano",
          onsuccess : function() {              
            MIDI.setVolume(0, 127);

            Game.piano = {
              'play' : function(sound, callback) {
                var melody = [];
                var velocity = 127;
                var delay = 0;

                switch (sound) {
                  case 'start':
                    melody = [
                      [60, 0], [64, 0.2], [67, 0.2], [71, 0.2],
                      [62, 1], [65, 0.2], [69, 0.2], [72, 0.2]
                    ];
                    break;

                  case 'advance':
                    /*for (var i = Game.board.length - 1; i > 0; i--) {
                      var row = Game.board[i];

                      for (var j = 0; j <
                    }*/
                    break;

                  case 'r':
                    melody = [[60, 0]];
                    break;

                  case 'g':
                    melody = [[64, 0]];
                    break;

                  case 'b':
                    melody = [[67, 0]];
                    break;
                }

                for (var i = 0; i < melody.length; i++) {
                  var note = melody[i][0];
                  delay += melody[i][1];
                  var noteOff = delay + 0.2;

                  if (i < melody.length - 1) {
                    noteOff = delay + melody[i + 1][1];
                  } else if (i == melody.length - 1) {
                    noteOff = delay + 1;
                  }

                  // console.log('Playing', [note, velocity, delay, noteOff]);

                  MIDI.noteOn(0, note, velocity, delay);
                  MIDI.noteOff(0, note, noteOff);
                }

                var timeout = (delay + 1) * 1000;

                if (callback) {
                  setTimeout(callback, timeout);
                }

                return { 'delay' : timeout };
              }
            };
          }
        });
      } else {
        console.debug('No MIDI found.');

        Game.piano = {
          'play' : function(sound, callback) {
            return { 'delay' : 1000 };
          }
        };
      }
    }

    // Fetch the level and points from the URL.
    var m = window.location.href.match(/#l?(\d*)?p?(\d*)?/)

    // console.log(m);

    if (m) {
      Game.level = parseInt(m[1], 10);
      Game.points = parseInt(m[2], 10);

      if (isNaN(Game.level)) {
        Game.level = 1;
      }

      if (isNaN(Game.points)) {
        Game.points = 0;
      }
    } else {
      Game.level = 1;
      Game.points = 0;
    }

    if (Game.level > 10) {
      Game.level = 10;
    }

    if (!keepBoard) {
      // Reset the game board.
      Game.board = [];

      for (var i = 0; i < 8; i++) {
        var row = [];

        for (var j = 0; j < Game.level; j++) {
          var colorIndex = Math.floor(Math.random() * Game.colors.length);
          var color = Game.colors[colorIndex];
          row.push(color);
        }

        Game.board.push(row);
      }
    }

    Game.instance = $('#game-board');
    $('#level span').text(Game.level);
    $('#points span').text(Game.points);
  },


  /*
   * START
   *
   * Starts the game
   *
   * @return void
   */
  'start' : function() {
    var d = Game.piano.play('start');

    $('#start').animate({'opacity' : 0}, d.delay, function() {
      $(this).hide();
      Game.paint();
    });
  },


  /*
   * CONNECT
   *
   * Connects to the WebSocket server.
   *
   * @return void
   */
  'connect' : function() {
    // Connect to the socket server.
    var socket;

    try {
        socket = new WebSocket('ws://localhost:8888/websocket');
    } catch (e) {
        return;
    }

    var prevButtons = null;

    // Handle socket events.
    socket.onmessage = function(e) {
        var buttons = e.data;

        // Since the button presses from Arduino will come as an unstoppable,
        // eternal stream of messages, we need to detect whether the button
        // is being held down (in which case the message sent will be the same
        // as the previous), and if it is, ignore it.
        if (buttons == prevButtons) {
          return;
        }

        prevButtons = buttons;

        // 'buttons' will contain three numbers. The first represents red,
        // the second green, the third blue. If the number is set to '1',
        // it means the corresponding colored button was pressed.
        var red = parseInt(buttons.substr(0, 1), 10);
        var green = parseInt(buttons.substr(1, 1), 10);
        var blue = parseInt(buttons.substr(2, 1), 10);

        if (red == 1) {
            Game.press('r');
        }

        if (green == 1) {
            Game.press('g');
        }

        if (blue == 1) {
            Game.press('b');
        }
    }

    socket.onopen = function(e) {
        socket.send('Ping!');
    }
  },


  /*
   * PAINT
   *
   * Paints the game's current row in the colors given by the game's board.
   *
   * @color The color ('r', 'g' or 'b') to paint the current step with (based
   *        on user input). [Optional]
   * @return void
   */
  'paint' : function(color) {
    if (color) {
      // Repaint the row based on user input.
      // console.log('Coloring', Game.prevRow, Game.prevStep);

      var $td = Game.instance.find('tr').eq(Game.prevRow)
                             .find('td').eq(Game.prevStep);

      Game.setColor($td, false);

      var $nextRow = Game.instance.find('tr').eq(Game.nextRow);

      if (Game.prevRow != Game.nextRow) {
        // If the game has advanced to a new row, paint it.
        // Otherwise, we're already painting the current row.
        $nextRow.find('td').each(Game.paintRow);
      } else if (!Game.advancing) {
        // If we're not advancing the game to the next level
        // (in which case the game's state will be reset and
        // misleading), we should set the next symbol.
        Game.setNext($nextRow.find('td').eq(Game.nextStep));
      }
    } else {
      // No color was given, meaning we're painting from initialization
      // instead of from user input.
      Game.instance.find('tr td').each(Game.paintRow);
    }
  },


  /*
   * PAINTROW
   *
   * Invoked by 'paint' and performs the actual painting.
   *
   * @return void
   */
  'paintRow' : function() {
    Game.interactive = false;

      var $td = $(this);
    var $row = $td.closest('tr');
    var rowIndex = $row.index();
      var columnIndex = $td.index();

      // Are we on a column that should be displayed on this level?
      if (columnIndex < Game.level) {
          // console.log('Clearing', rowIndex, columnIndex);

          $td.attr('class', 'x');

          // Are we on the row that should be played next?
      if (rowIndex == Game.nextRow) {
        var timeout = 1000 * (columnIndex + 1);
        setTimeout(Game.setColor, timeout, $td, true);

        // Are we on the column that should be played next?
        if (columnIndex == Game.nextStep) {
          timeout = 1000 * (Game.level + 1);
          setTimeout(Game.setNext, timeout, $td);
        }
      }
      }
  },


  /*
   * GETCOLOR
   *
   * Returns the color of the provided $td. If not provided, returns the
   * color of the game's current step.
   *
   * @$td The table data column to get the color of.
   * @return The color of the provided $td or the game's current step.
   */
  'getColor' : function($td) {
    var rowIndex = 0;
    var columnIndex = 0;

    if ($td) {
      var $row = $td.closest('tr');
      rowIndex = $row.index();
      columnIndex = $td.index();
    } else {
      rowIndex = Game.nextRow;
      columnIndex = Game.nextStep;
    }

    return Game.board[rowIndex][columnIndex];
  },


  /*
   * SETCOLOR
   *
   * Sets color to the provided $td based on the value returned from 'Game.getColor'.
   *
   * @$td The table data column to add the color to.
   * @return void
   */
  'setColor' : function($td, remove) {
    var color = Game.getColor($td);
    $td.attr('class', color);

    Game.piano.play(color);

    // Special handling of level 1. No need to remove the color
    // since it will be replaced by the next arrow anyway.
    if (Game.level > 1 && remove) {
      setTimeout(Game.removeColor, 1000, $td);
    }
  },


  /*
   * REMOVECOLOR
   *
   * Removes the color from the provided $td.
   *
   * @$td The table data column to remove the color from.
   * @return void
   */
  'removeColor' : function($td) {
    var color = Game.getColor($td);
    $td.attr('class', 'x');
  },


  /*
   * SETNEXT
   *
   * Sets the next symbol to the provided $td.
   *
   * @$td The table data column to set the arrow on.
   * @return void
   */
  'setNext' : function($td) {
    $td.attr('class', 'n');
    Game.interactive = true;
  },


  /*
   * PRESS
   *
   * The function that advances the game after the user has pressed a color button.
   *
   * @color The color the user pressed.
   * @return void
   */
  'press' : function(color) {
    var expectedColor = Game.getColor();

    if (color == expectedColor) {
      // Increase points
      Game.points += Game.level;
      $('#points span').text(Game.points);

      // Correct color pressed, advance to the next step.
      Game.prevStep = Game.nextStep;
      Game.prevRow = Game.nextRow;
      Game.nextStep++;

      // If the next step is greater than the level of the game
      // (meaning we're on the last column/step of the game board),
      // advance one row (starting on 7, moving down to 0) instead.
      if (Game.nextStep >= Game.level) {
        Game.nextStep = 0;
        Game.nextRow--;
      }

      // If we've reached the very top, advance to the next level!
      if (Game.nextRow < 0) {
        Game.nextRow = 0;
        Game.advancing = true;
        setTimeout(Game.advance, 1000)
      }
    } else {
      // Wrong color pressed, reset!
      color = undefined;
      Game.failed = true;
      Game.reset();
      Game.initialize(false, true);
    }

    Game.paint(color);
  },


  /*
   * ADVANCE
   *
   * Advances the game up one level.
   *
   * @return void
   */
  'advance' : function() {
    var timeout = 0;

    Game.instance.find('td.r, td.g, td.b').attr('class', 'x');

    for (var i = Game.board.length - 1; i >= 0; i--) {
      var row = Game.board[i];
      var $tr = Game.instance.find('tr').eq(i);

      for (var j = 0; j < row.length; j++) {
        var $td = $tr.find('td').eq(j);
        setTimeout(Game.setColor, timeout++ * 250, $td, false);
      }
    }

    setTimeout(function() {
      Game.reset();

      if (!Game.failed) {
        Game.points += Game.level * 10;
      }

      var level = ++Game.level;
      window.location.hash = '#l' + level + 'p' + Game.points;
      Game.initialize(false, false);
      Game.advancing = false;
      Game.failed = false;
      Game.paint();
    }, (timeout + 1) * 250);
  },


  /*
   * RESET
   *
   * Resets the game to the initial state.
   *
   * @return void
   */
  'reset' : function() {
    Game.nextStep = 0;
    Game.prevStep = 0;
    Game.nextRow = 7;
    Game.prevRow = 0;
  },
};


/*
 * The jQuery 'onready' event.
 */
jQuery(function($) {
  Game.initialize(true, false);

    $('#start a').on('click tap', function() {
      Game.start();
      return false;
    });

    $('#touch-red').on('click tap', function() {
        Game.press('r');
        return false;
    });

    $('#touch-green').on('click tap', function() {
        Game.press('g');
        return false;
    });

    $('#touch-blue').on('click tap', function() {
        Game.press('b');
        return false;
    });

    // The user should be able to press the 'r', 'g' and 'b' keys on the keyboard
    $(document).on('keypress', function(e)	{
      if (!Game.interactive) {
        // Game in non-interactive mode. Please wait!
        return;
      }

      switch (e.which) {
        case 82:  // R
        case 114: // r
          Game.press('r');
          break;

      case 71:  // G
        case 103: // g
          Game.press('g');
          break;

      case 66: // B
        case 98: // b
          Game.press('b');
          break;
      }
    });
});