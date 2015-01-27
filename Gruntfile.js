module.exports = function(grunt) {
  'use strict';

  grunt.initConfig({
    pkg: grunt.file.readJSON('package.json'),

    watch: {
      sass: {
        files: 'stylesheets/scss/**/*.scss',
        tasks: ['stylesheet']
      },
      js: {
        files: 'scripts/main.js',
        tasks: ['script']
      }
    },

    sass: {
      dist: {
        options: {
          style: 'compact',
          sourcemap: 'none'
        },
        files: [{
          expand: true,
          cwd: 'stylesheets/scss',
          src: ['*.scss'],
          dest: 'stylesheets/css',
          ext: '.css'
        }]
      }
    },

    cssmin: {
      dist: {
        files: {
          'dist/css/style.min.css': ['stylesheets/css/site.css', 'stylesheets/css/style.css']
        }
      }
    },

    uglify: {
      dist: {
        files: {
          'dist/js/main.min.js': ['scripts/main.js']
        }
      }
    },

    concat: {
      js: {
        src: ['scripts/zepto.min.js', 'dist/js/main.min.js'],
        dest: 'dist/js/main.min.js',
      }
    }

  });

  grunt.loadNpmTasks('grunt-contrib-watch');
  grunt.loadNpmTasks('grunt-contrib-sass');
  grunt.loadNpmTasks('grunt-contrib-uglify');
  grunt.loadNpmTasks('grunt-contrib-cssmin');
  grunt.loadNpmTasks('grunt-contrib-copy');
  grunt.loadNpmTasks('grunt-contrib-concat');

  grunt.registerTask('stylesheet', ['sass:dist', 'cssmin:dist']);
  grunt.registerTask('script', ['uglify:dist', 'concat:js']);
  grunt.registerTask('build', ['stylesheet', 'script']);
  grunt.registerTask('default', ['build', 'watch']);

};
