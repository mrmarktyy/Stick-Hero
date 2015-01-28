$(function() {
  'use strict';

  function Game(options) {

    this.options = options || {};
    var GAME_DEFAULT_WIDTH = 320;
    var GAME_DEFAULT_HEIGHT = 480;
    var GAME_WIDTH = this.options.width || GAME_DEFAULT_WIDTH;
    var GAME_HEIGHT = this.options.height || GAME_DEFAULT_HEIGHT;
    var WIDTH_RATIO = GAME_WIDTH / GAME_DEFAULT_WIDTH;
    var HEIGHT_RATIO = GAME_HEIGHT / GAME_DEFAULT_HEIGHT;
    var BOX_BASE_WIDTH = 50 * WIDTH_RATIO; //
    var BOX_HEIGHT = 100 * HEIGHT_RATIO; //
    var HERO_WIDTH = 18 * WIDTH_RATIO; //
    var HERO_HEIGHT = 24 * WIDTH_RATIO; //
    var HERO_FEET = 5;
    var HERO_BOTTOM = BOX_HEIGHT + HERO_FEET;
    var HERO_RIBBON = HERO_WIDTH + 2;
    var STICK_WIDTH = 3;
    var STICK_LEFT = BOX_BASE_WIDTH - STICK_WIDTH;
    var STICK_BOTTOM = BOX_HEIGHT;
    var GAP = 4;
    var HERO_INIT_LEFT = BOX_BASE_WIDTH - HERO_WIDTH - GAP - STICK_WIDTH;
    var STICK_INIT_LEFT = BOX_BASE_WIDTH - STICK_WIDTH;
    var BOX_LEFT_MIN = BOX_BASE_WIDTH + 20;
    var BOX_LEFT_MAX = GAME_WIDTH - BOX_BASE_WIDTH;
    var BOX_WIDTH_MIN = 15 * WIDTH_RATIO;  //
    var BOX_WIDTH_MAX = 69 * WIDTH_RATIO;  //
    var STICK_INC = 3;
    var ANIMATION_END_EVENTS = 'transitionend webkitTransitionEnd animationend webkitAnimationEnd MSAnimationEnd oAnimationEnd';
    var TITLE_DEFAULT = '';
    var DOWNKEYS = {};
    var IS_WECHAT = !!navigator.userAgent.match(/MicroMessenger/);
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
      this.initVars();
      this.bindEvents();
      this.reset();
    };

    this.initVars = function() {
      this.$title = $('title');
      TITLE_DEFAULT = this.$title.text();
      this.$copyright = $('.copyright');
      this.$game = $('#game').css({
        width: GAME_WIDTH + 'px',
        height: GAME_HEIGHT + 'px'
      });
      this.$name = $('.name');
      this.$hero = $('.hero1').css({
        width: HERO_WIDTH + 'px',
        height: HERO_HEIGHT + 'px'
      });
      this.$ribbon = $('.hero1 .ribbon').css({
        width: HERO_RIBBON + 'px'
      });
      this.$feet = $('.foot');
      this.$gameover = $('.game-over');
      this.$welcome = $('.welcome');
      this.$share = $('.share');
      this.$liveScore = $('.live-score');
      this.$instruction = $('.instruction');
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
      $(document).on('click touchstart', '.btn-play', function() {
        self.nextAfterAnimated(self.$name, STATES.PRE_BEGIN);
        self.$name.addClass('hinge');
      });
      $(document).on('click touchstart', '.btn-playagain', function() {
        self.reset();
        self.next(STATES.PRE_BEGIN);
      });
      $(document).on('click touchstart', '.btn-share', function() {
        self.$share.show();
      });
      $(document).on('click touchstart', '.share.overlay', function() {
        self.$share.hide();
      });
      $(document).on('keypress', function(event) {
        DOWNKEYS[event.keyCode] = true;
      });
      $(document).on('keyup', function(event) {
        DOWNKEYS[event.keyCode] = false;
      });
      $(document).on('touchstart', function(e) {
        DOWNKEYS['touching'] = true;
        e.preventDefault();
      });
      $(document).on('touchend', function() {
        DOWNKEYS['touching'] = false;
      });
    };

    this.reset = function() {
      this.score = 0;
      this.best = localStorage.getItem('best') || 0;
      this.bg = 'bg' + this._getRandom(1, 5);
      this.$title.text(TITLE_DEFAULT);
      this.$game
        .removeClass('bounce bg1 bg2 bg3 bg4 bg5')
        .addClass(this.bg);
      this.$liveScore.hide();
      this.$gameover.hide();
      this.$welcome.hide();
      this.updateScore();

      $('.box, .stick').remove();
      this.$feet.removeClass('walk');
      this.$box1 = $('<div />').addClass('box').css({
        height: BOX_HEIGHT + 'px',
        left: (GAME_WIDTH - BOX_BASE_WIDTH) / 2 + 'px',
        width: BOX_BASE_WIDTH + 'px'
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
      $elm.on(ANIMATION_END_EVENTS, function() {
        $elm.off(ANIMATION_END_EVENTS);
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
        this.$copyright.hide();
        this.$liveScore.show();

        this._createBox();
        this.$box2 = $('<div />').addClass('box').css({
          height: BOX_HEIGHT + 'px',
          width: this._newBox.width + 'px',
          left: '200%'
        });
        this.$game.append(this.$box2);
        this.nextAfterAnimated(this.$box2);

        this.$hero.css({left: (BOX_BASE_WIDTH - HERO_WIDTH - GAP - STICK_WIDTH) + 'px'});
        this.$box1.css({left: 0});
        this.$instruction.addClass('in');

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

        this._validStickMin = this._newBox.left - BOX_BASE_WIDTH;
        this._validStickMax = this._validStickMin + this._newBox.width;

        this.$activeStick = $('<div />')
          .addClass('stick')
          .css({
            left: STICK_LEFT + 'px',
            bottom: STICK_BOTTOM + 'px'
          });
        this.$game.append(this.$activeStick);

        this._firstRun = false;
      }

      if (this._isPressed()) {
        this.$hero.parent().addClass('shake');
        this.$instruction.removeClass('in');
        this._activeStickHeight += STICK_INC;
        this.$activeStick.css('height', this._activeStickHeight + 'px');
        this._pressStarted = true;
        return;
      }

      if (this._pressStarted) {
        this.$hero.parent().removeClass('shake');
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

        this.dx = this._newBox.left + this._newBox.width - BOX_BASE_WIDTH;
        if (this._activeStickHeight > this._validStickMin &&
          this._activeStickHeight < this._validStickMax) {
          this.nextAfterAnimated(this.$hero, STATES.SHIFTING);

          this.$hero.css('left', HERO_INIT_LEFT + this.dx + 'px');
          this.$hero[0].style['transition-duration'] = this.dx / 300 + 's';
        } else {
          this.nextAfterAnimated(this.$hero, STATES.DYING);

          this.$hero.css('left', HERO_INIT_LEFT + GAP + HERO_WIDTH + this._activeStickHeight + 'px');
          this.$hero[0].style['transition-duration'] = (GAP + HERO_WIDTH + this._activeStickHeight) / 300 + 's';
        }

        this._firstRun = false;
      }
    };

    this.shiftingState = function() {
      if (this._firstRun) {
        this.nextAfterAnimated(this.$hero, STATES.UPDATE);

        this._createBox();
        this.$feet.removeClass('walk');
        this.$hero[0].style['transition-duration'] = '';
        this.$hero.css('left', parseInt(this.$hero.css('left'), 10) - this.dx + 'px');
        this.$box1.css('left', parseInt(this.$box1.css('left'), 10) - this.dx + 'px');
        this.$box2.css('left', parseInt(this.$box2.css('left'), 10) - this.dx + 'px');
        this.$movedStick.css('left', parseInt(this.$movedStick.css('left'), 10) - this.dx + 'px');
        this.$box3 = $('<div />').addClass('box').css({
          height: BOX_HEIGHT + 'px',
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

        this.$hero[0].style['transition-duration'] = '';
        this.$hero.css('bottom', -HERO_HEIGHT + 'px');
        this.$activeStick.addClass('died');

        this._firstRun = false;
      }
    };

    this.updateState = function() {
      this.score++;
      this.updateScore();

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
      if (IS_WECHAT) {
        this.$title.text(TITLE_DEFAULT + ': ' + '我一不小心就前进了' + this.score + '步，你敢挑战我吗？小伙伴们快来一起玩耍吧！');
      }
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

    return this;
  }

  var viewportWidth = $(window).width();
  var viewportHeight = $(window).height();
  var options = {};
  if (viewportWidth < viewportHeight && viewportWidth < 500) {
    options.width = viewportWidth;
    options.height = viewportHeight;
  }
  new Game(options).play();
});
