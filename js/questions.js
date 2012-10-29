$(function() {

  var Templates = {};

  $("script[type=handlebars]").each(function() {
    Templates[this.id] = Handlebars.compile($(this).html());
  });

  var Who = window.Who = {};

  /** Router **/
  Who.Router = Backbone.Router.extend({
    routes: {
      "": "start",
      "about": "about",
      "question/:id": "question"
    },

    start: function() {
      Who.state.set("question",0);
    },

    about: function() {

    },

    question: function(num) {
      Who.state.set("question",parseInt(num,10));
    }

  });

  /** Models and collections **/
  Who.QuestionState = Backbone.Model.extend({ 
  

    setQuestions: function(questions) {
      this.questions = questions;

      questions.on("change:response",this.retotal,this);
    },

    retotal: function() {


      this.set("position",
       _.reduce(this.questions.pluck("response"),
          function(memo, num){ return memo + (num||0); }, 0)
      )


      console.log("Retotal");

    }
  
  });


  Who.Question = Backbone.Model.extend({
    initialize: function() {
      if(!this.get("left")) { this.set("left","Yes") }
      if(!this.get("right")) { this.set("right","No") }
    }

  });


  Who.QuestionList = Backbone.Collection.extend({
    model: Who.Question
  });


  /** Views **/
  Who.QuestionContainer = Backbone.View.extend({
    id: "container",

    initialize: function() {
      this.model.on("change:question",this.questionChange,this);
      this.questions = [];

      this.currentQuestion = null;

    },

    questionChange: function(model,to) {
      var from = model.previous("question");
      var view = this.questions[to], last;

      if(!view) {
        view = this.questions[to] = new Who.QuestionView({ model: this.collection.at(to), number: to });
        $(this.el).append(view.render().el);
      } 

      if(this.questions[from]) {
        last = this.questions[from];
      }

      // Forwards
      if(to > from) {
        view.setNext();

        if(last) { last.movePrevious(); }
        view.moveActive();

      } else if(to < from) {
      // Backwards
        view.setPrevious();

        if(last) { last.moveNext(); }
        view.moveActive();
      }

    },

    render: function() {

      return this;
    }

  });


  Who.QuestionView = Backbone.View.extend({
    template: "question-template",
    className: "question",
    tagName: "article",

    initialize: function(options) {
      this.number = options.number;
      _.bindAll(this,"goNext");
    },

    events: {
      'click .left-answer': 'left',
      'click .right-answer': 'right'
    },

    right: function(e) {
      this.model.set("response",1);
      this.$(".next-line").hide().css("height",0);


      e.preventDefault();
      var $el = $(this.el);

      var w = $el.width();
      var buttonWidth = this.$(".right-answer").width();
      this.$(".question-holder").animate({
        left: -w/2 + buttonWidth/2 + 15
      },this.goNext);

      this.$(".left-answer").removeClass("selected");
      this.$(".right-answer").addClass("selected");
    },

    left: function(e) {
      this.model.set("response",-1);

      this.$(".next-line").hide().css("height",0);

      e.preventDefault();
      var $el = $(this.el);

      var w = $el.width();
      var buttonWidth = this.$(".left-answer").width();
      this.$(".question-holder").animate({
        left: w/2 - buttonWidth/2 - 15
      },this.goNext);

      this.$(".right-answer").removeClass("selected");
      this.$(".left-answer").addClass("selected");
    },

    goNext: function() {
      var self = this;
      this.$(".next-line").show().animate({ height: 500 },function() {

        Who.router.navigate("question/" + (self.number+1), { trigger: true });
        //Who.state.set("question",self.number+1)
      });

    },

    render: function() {

      $(this.el).empty().html(Templates[this.template](this.model.toJSON()));

      return this;
    },



    moveActive: function() {
      var self=this;
      setTimeout(function() {
        $(self.el).addClass("transition").removeClass("next").removeClass("previous");
      },1);
    },

    moveNext: function() {
      var self=this;
      setTimeout(function() {
        $(self.el).addClass("transition").addClass("next");
      },1);
    },

    movePrevious: function() {
      var self=this;
      setTimeout(function() {
        $(self.el).addClass("transition").addClass("previous");
      },1);
    },

    setNext: function() {
      $(this.el).removeClass("transition").addClass("next");
    },

    setPrevious: function() {
      $(this.el).removeClass("transition").addClass("previous");
    },

  });

  Who.BarView = Backbone.View.extend({
    template: "bar-template",
    id: "poll-footer",
    tagName: "footer",

    initialize: function() {
      this.model.on("change:position",this.updateMarker,this);
    },

    render: function() {
      $(this.el).empty().html(Templates[this.template]());
      this.updateMarker();

      return this;
    },

    updateMarker: function() {
      var position = this.model.get("position");
      this.$("#marker").css({ left: position*20 });
    }

  });


  /** Initialization **/

  var questions = new Who.QuestionList([
    { 
      category: "Health Care",
      question: "Should the U.S. have universal healthcare?"
    },
    { 
      category: "Abortion",
      question: "What's your position on Abortion?",
      left: "Pro-choice",
      right: "Pro-life"
    },
    { 
      category: "Health Care",
      question: "Do you want universsal healthcare?"
    },

  ]);


  Who.state = new Who.QuestionState({

  });

  Who.state.setQuestions(questions);

  $("body").on("touchmove",function(e) { e.preventDefault() });

  var container = new Who.QuestionContainer({ model: Who.state, collection: questions });
  $("#wrapper").append(container.render().el);


  var bar = new Who.BarView({ model: Who.state });
  $("body").append(bar.render().el);

  window.location.hash = "#";

  Who.router = new Who.Router();
  Backbone.history.start();
});
