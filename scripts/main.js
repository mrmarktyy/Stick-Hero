$(function() {
  'use strict';

  function Game(options) {
    this.options = options || {};
    var DOWNKEYS = {};
    var GAME_WIDTH = 320;
    var GAME_HEIGHT = 480;
    var BOX_WIDTH = 50;
    var STICK_WIDTH = 3;
    var HERO_WIDTH = 18;
    var HERO_HEIGHT = 24;
    var HERO_BOTTOM = 85;
    var GAP = 4;
    var HERO_INIT_LEFT = BOX_WIDTH - HERO_WIDTH - GAP - STICK_WIDTH;
    var STICK_INIT_LEFT = BOX_WIDTH - STICK_WIDTH;
    var BOX_LEFT_MIN = 70;
    var BOX_LEFT_MAX = 270;
    var BOX_WIDTH_MIN = 15;
    var BOX_WIDTH_MAX = 69;
    var STICK_INC = 3;
    var STATES = {
      WELCOME: 0,
      PRE_BEGIN: 1,
      BEGIN: 2,
      STICK_ROTATION: 3,
      HERO_WALK: 4,
      SHIFTING: 5,
      DYING: 6,
      UPDATE: 7,
      DEAD: 8
    };

    this.init = function() {
      this.prepareVars();
      this.bindEvents();
      this.reset();
    };

    this.prepareVars = function() {
      this.$game = $('#game').css({
        width: GAME_WIDTH + 'px',
        height: GAME_HEIGHT + 'px'
      });
      this.$name = $('.name');
      this.$hero = $('.hero');
      this.$feet = $('.foot');
      this.$gameover = $('.game-over');
      this.$welcome = $('.welcome');
      this.$liveScore = $('.live-score');
      this.$score = $('.score');
      this.$best = $('.best');
      this.$movedStick = $('nothing');
      this.main = $.proxy(this.mainLoop, this);
      this._currentState = STATES.WELCOME;
      this._pressStarted = false;
      this._firstRun = true;
    };

    this.bindEvents = function() {
      var self = this;
      $(document).on('keypress', function(event) {
        if (event.keyCode === 32) {
          if (self._currentState === STATES.WELCOME) {
            $('.btn-play').trigger('click');
          } else if (self._currentState === STATES.DEAD) {
            $('.btn-playagain').trigger('click');
          }
        }
      });
      $(document).on('click', '.btn-play', function() {
        self.nextAfterAnimated(self.$name, STATES.PRE_BEGIN);
        self.$name.addClass('hinge');
        // self.next(STATES.PRE_BEGIN);
      });
      $(document).on('click', '.btn-playagain', function() {
        self.reset();
        self.next(STATES.PRE_BEGIN);
      });
      $(document).on('keypress', function(event) {
        DOWNKEYS[event.keyCode] = true;
      });
      $(document).on('keyup', function(event) {
        DOWNKEYS[event.keyCode] = false;
      });
      $(document).on('touchstart', function() {
        DOWNKEYS['touching'] = true;
      });
      $(document).on('touchend', function() {
        DOWNKEYS['touching'] = false;
      });
    };

    this.reset = function() {
      this.score = 0;
      this.best = localStorage.getItem('best') || 0;
      this.$game.removeClass('bounce');
      this.$liveScore.hide();
      this.$gameover.hide();
      this.$welcome.hide();
      this.updateScore();

      $('.box, .stick').remove();
      this.$feet.removeClass('walk');
      this.$box1 = $('<div />').addClass('box').css({
        left: (GAME_WIDTH - BOX_WIDTH) / 2 + 'px',
        width: BOX_WIDTH + 'px'
      });
      this.$hero.css({
        bottom: HERO_BOTTOM + 'px',
        left: (GAME_WIDTH - HERO_WIDTH) / 2 + 'px'
      });
      this.$game.append(this.$box1);
    };

    this.mainLoop = function() {
      switch (this._currentState) {
        case STATES.WELCOME:
          this.welcomeState();
          break;
        case STATES.PRE_BEGIN:
          this.preBeginState();
          break;
        case STATES.BEGIN:
          this.beginState();
          break;
        case STATES.STICK_ROTATION:
          this.stickRotationState();
          break;
        case STATES.HERO_WALK:
          this.heroWalkState();
          break;
        case STATES.SHIFTING:
          this.shiftingState();
          break;
        case STATES.DYING:
          this.dyingState();
          break;
        case STATES.UPDATE:
          this.updateState();
          break;
        case STATES.DEAD:
          this.deadState();
          break;
        default:
      }

      if (this.isContinue()) {
        this.play();
      }
    };

    this.play = function() {
      window.requestAnimationFrame(this.main);
    };

    this.isContinue = function() {
      return true;
    };

    this.next = function(state) {
      this._firstRun = true;
      if (state !== void 0) {
        this._currentState = state;
        return;
      }
      var lastState = Object.keys(STATES).length - 1;
      if (this._currentState === lastState) {
        this._currentState = 0;
      } else {
        this._currentState++;
      }
    };

    this.nextAfterAnimated = function($elm, state) {
      var self = this;
      $elm.on('transitionend webkitTransitionEnd animationend webkitAnimationEnd MSAnimationEnd oAnimationEnd', function() {
        $elm.off('transitionend webkitTransitionEnd animationend webkitAnimationEnd MSAnimationEnd oAnimationEnd');
        self.next(state);
      });
    };

    this.welcomeState = function() {
      this.$gameover.hide();
      this.$liveScore.hide();
      this.$welcome.show();
    };

    this.preBeginState = function () {
      if (this._firstRun) {
        this.$welcome.hide();
        this.$gameover.hide();
        this.$liveScore.show();

        this._createBox();
        this.$box2 = $('<div />').addClass('box').css({
          width: this._newBox.width + 'px',
          left: '250%'
        });
        this.$game.append(this.$box2);
        this.nextAfterAnimated(this.$box2);

        this.$hero
          .addClass('shift')
          .css({left: (BOX_WIDTH - HERO_WIDTH - GAP - STICK_WIDTH) + 'px'});
        this.$box1.css({left: 0});

        var self = this;
        setTimeout(function() {
          self.$box2.css('left', self._newBox.left + 'px');
        }, 0);

        this._firstRun = false;
      }
    };

    this.beginState = function() {
      if (this._firstRun) {

        this._activeStickHeight = 0;

        this._validStickMin = this._newBox.left - BOX_WIDTH;
        this._validStickMax = this._validStickMin + this._newBox.width;

        this.$hero.removeClass('shift');
        this.$activeStick = $('<div />').addClass('stick');
        this.$game.append(this.$activeStick);

        this._firstRun = false;
      }

      if (this._isPressed()) {
        this.$hero.addClass('shake');
        this._activeStickHeight += STICK_INC;
        this.$activeStick.css('height', this._activeStickHeight + 'px');
        this._pressStarted = true;
        return;
      }

      if (this._pressStarted) {
        this.$hero.removeClass('shake');
        this._pressStarted = false;
        this.next();
      }
    };

    this.stickRotationState = function() {
      if (this._firstRun) {
        this.nextAfterAnimated(this.$activeStick);

        this.$activeStick.addClass('rotate');

        this._firstRun = false;
      }
    };

    this.heroWalkState = function() {
      if (this._firstRun) {
        this.$feet.addClass('walk');

        this.dx = this._newBox.left + this._newBox.width - BOX_WIDTH;
        if (this._activeStickHeight >= this._validStickMin &&
          this._activeStickHeight <= this._validStickMax) {
          this.nextAfterAnimated(this.$hero, STATES.SHIFTING);

          this.$hero.css('left', HERO_INIT_LEFT + this.dx + 'px');
        } else {
          this.nextAfterAnimated(this.$hero, STATES.DYING);

          this.$hero.css('left', HERO_INIT_LEFT + GAP + HERO_WIDTH + this._activeStickHeight + 'px');
        }

        this._firstRun = false;
      }
    };

    this.shiftingState = function() {
      if (this._firstRun) {
        this.nextAfterAnimated(this.$hero, STATES.UPDATE);

        this._createBox();
        this.$feet.removeClass('walk');
        this.$hero.addClass('shift')
          .css('left', parseInt(this.$hero.css('left'), 10) - this.dx + 'px');
        this.$box1.css('left', parseInt(this.$box1.css('left'), 10) - this.dx + 'px');
        this.$box2.css('left', parseInt(this.$box2.css('left'), 10) - this.dx + 'px');
        this.$movedStick.css('left', parseInt(this.$movedStick.css('left'), 10) - this.dx + 'px');
        this.$box3 = $('<div />').addClass('box').css({
          width: this._newBox.width + 'px',
          left: '200%'
        });
        this.$game.append(this.$box3);

        var self = this;
        setTimeout(function() {
          self.$box3.css('left', self._newBox.left + 'px');
        }, 0);

        this.$activeStick.css('left', STICK_INIT_LEFT - this.dx + 'px');

        this._firstRun = false;
      }
    };

    this.dyingState = function() {
      if (this._firstRun) {
        this.nextAfterAnimated(this.$hero, STATES.DEAD);

        this.$hero.css('bottom', -HERO_HEIGHT + 'px');
        this.$activeStick.addClass('died');

        this._firstRun = false;
      }
    };

    this.updateState = function() {
      this.score++;
      this.updateScore();
      this.$hero.removeClass('shift');

      this.$box1.remove();
      this.$box1 = this.$box2;
      this.$box2 = this.$box3;

      this.$movedStick.remove();
      this.$movedStick = this.$activeStick;

      this.next(STATES.BEGIN);
    };

    this.deadState = function() {
      this.$liveScore.hide();
      this.$gameover.show();
      this.$game.addClass('bounce');
    };

    this.updateScore = function() {
      if (this.best < this.score) {
        this.best = this.score;
        localStorage.setItem('best', this.best);
      }

      this.$liveScore.text(this.score);
      this.$score.text(this.score);
      this.$best.text(this.best);
    };

    this._isPressed = function() {
      return (DOWNKEYS[32] || DOWNKEYS['touching']);
    };

    this._createBox = function() {
      this._newBox = {
        left: this._getRandom(BOX_LEFT_MIN, BOX_LEFT_MAX),
        width: this._getRandom(BOX_WIDTH_MIN, BOX_WIDTH_MAX)
      };
    };

    this._getRandom = function(min, max) {
      return Math.floor(Math.random() * (max - min + 1)) + min;
    };

    this.init();
  }

  function LOG(msg) {
    console.log('[INFO  ] ', msg);
  }

  var game = new Game();
  game.play();
});
