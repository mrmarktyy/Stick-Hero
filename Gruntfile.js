module.exports = function(grunt) {
  'use strict';

  grunt.initConfig({
    pkg: grunt.file.readJSON('package.json'),

    watch: {
      sass: {
        files: 'stylesheets/scss/**/*.scss',
        tasks: ['sass:dist']
      }
    },

    sass: {
      dist: {
        options: {
          style: 'compact'
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

    uglify: {
      dist: {
        files: {
          'dist/main.min.js': ['scripts/main.js']
        }
      }
    },

    cssmin: {
      dist: {
        files: {
          'dist/css/style.min.css': ['stylesheets/css/site.css', 'stylesheets/css/style.css']
        }
      }
    }

  });

  grunt.loadNpmTasks('grunt-contrib-watch');
  grunt.loadNpmTasks('grunt-contrib-sass');
  grunt.loadNpmTasks('grunt-contrib-uglify');
  grunt.loadNpmTasks('grunt-contrib-cssmin');

  grunt.registerTask('default', ['sass:dist', 'watch']);
  grunt.registerTask('build', ['sass:dist', 'cssmin:dist', 'uglify:dist']);

};
