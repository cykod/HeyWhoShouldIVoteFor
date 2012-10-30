$(function() {

  Parse.initialize("p1KNYO5zGKq3Bc2xvViGP3ERkgHeAmQP7nWsxuKu", "K0uMjtWtwVoRejaiNZJeAmIgsJvyfQ8S0DjOZZS6");

  var DataSaver = Parse.Object.extend("DataSaver");

  var voteData = new DataSaver({ result: [] });

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
      );

    }
  
  });


  Who.Question = Backbone.Model.extend({
    initialize: function() {
      if(!this.get("left")) { this.set("left","Yes"); }
      if(!this.get("right")) { this.set("right","No"); }
    }

  });


  Who.QuestionList = Backbone.Collection.extend({
    model: Who.Question
  });


  var cloc = google.loader.ClientLocation;
  if(cloc) {
    voteData.set({
      city: cloc.address.city,
      region: cloc.address.region,
      country_code: cloc.address.country_code
    });
  }


  Who.ItemView = Backbone.View.extend({

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
    }

  });

  Who.TitleView = Who.ItemView.extend({
    template: "title-template",
    className: "title",
    tagName: "div",
    
    events: {
      "click .start": "start",
      "touchstart .start": "start"
    },

    render: function() {
      $(this.el).empty().html((Templates[this.template]()));

      if(Who.bar) {
        this.$(".bar").hide();
      }
      return this;
    },


    start: function(e) {
      e.preventDefault();

      if(!Who.bar) {
        Who.bar = new Who.BarView({ model: Who.state });
        this.$(".bar").fadeOut();
        $("body").append(Who.bar.render().el);
        $(Who.bar.el).hide().fadeIn();
      }


      var h = $(window).height() * 1.2 - $(this.el).height();
      this.$(".next-line").show().animate({ height: h },
        function() {
          Who.router.navigate("question/1");
          Who.state.set("question",1);
        });
   }
  });

  Who.FinalView = Who.ItemView.extend({
    template: "final-template",
    className: "final",
    tagName: "div",
    
    render: function() {
      var data = {
        voteFor: this.model.get("position") < 0 ? "Obama" : "Romney",
        percent: Math.abs(this.model.get("position")),
        url: encodeURIComponent("http://HeyWhoShouldIVoteFor.com"),
        text: encodeURIComponent("I'm testering")
      };

      data.className = data.voteFor.toLowerCase();

      if(data.percent === 0) {
        data.text = encodeURIComponent("Hey, I shouldn't vote for either of these guys! #election2012");
        $(this.el).empty().html(Templates['final-template-nobody'](data));
      } else {
        if(data.percent < 10) {
          data.text = encodeURIComponent("Hey, I should vote for " + data.voteFor + " (well, at least " + data.percent + "0% of me should) #election2012");
        } else {
          data.text = encodeURIComponent("Hey, I should 100% vote for " + data.voteFor + ". #election2012");
        }
        $(this.el).empty().html(Templates[this.template](data));
      }
      return this;
    }

  });


  /** Views **/
  Who.QuestionContainer = Backbone.View.extend({
    id: "container",

    initialize: function() {
      this.model.on("change:question",this.questionChange,this);
      this.questions = [];

      this.currentQuestion = null;

      this.questions[0] = new Who.TitleView();
    },

    questionChange: function(model,to) {
      var from = model.previous("question");
      var view = this.questions[to], last;

      $("#background .bg:visible").fadeOut(500);

      if(!view && this.collection.at(to-1)) {
        view = this.questions[to] = new Who.QuestionView({ model: this.collection.at(to-1), number: to });
        $(this.el).append(view.render().el);
      } else {
        if(!view) {
          view = this.questions[to] = new Who.FinalView({ model: Who.state });
          $(this.el).append(view.render().el);
        }

        view.render();
      }

      if(this.questions[from]) {
        last = this.questions[from];
      }

      if(view.model && view.model.get("background")) {
        setTimeout(function() {
            $("#" + view.model.get("background")).show().css({ opacity:0 }).animate({ opacity: 1.0 });
          },500);
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
      $(this.el).append(this.questions[0].render().el);

      return this;
    }

  });


  Who.QuestionView = Who.ItemView.extend({
    template: "question-template",
    className: "question",
    tagName: "div",

    initialize: function(options) {
      this.number = options.number;
      _.bindAll(this,"goNext");
    },

    events: {
      'click .left-answer': 'left',
      'click .right-answer': 'right',
      'touchstart .left-answer': 'left',
      'touchstart .right-answer': 'right'
    },

    right: function(e) {
      var result = _.clone(voteData.get("result"));
      result.push([ this.model.get("category"), this.model.get("right") ])

      voteData.save({result: result });
       _gaq.push(['_trackEvent','Choice',this.model.get("category"),this.model.get("right")]);

      this.model.set("response",this.model.get("right"));



      this.$(".next-line").hide().css("height",0);


      e.preventDefault();
      var $el = $(this.el);

      var w = this.$(".question-holder").width();
      var buttonWidth = this.$(".right-answer").width();
      this.$(".question-holder").animate({
        left: -w/2 + buttonWidth/2 + 15
      },this.goNext);

      this.$(".left-answer").removeClass("selected");
      this.$(".right-answer").addClass("selected");
    },

    left: function(e) {
      var result = voteData.get("result");
      result.push([ this.model.get("category"), this.model.get("left") ])
      voteData.save();
       _gaq.push(['_trackEvent','Choice',this.model.get("category"),this.model.get("left")]);

      this.model.set("response",this.model.get("left"));

      this.$(".next-line").hide().css("height",0);

      e.preventDefault();
      var $el = $(this.el);

      var w = this.$(".question-holder").width();
      var buttonWidth = this.$(".left-answer").width();
      this.$(".question-holder").animate({
        left: w/2 - buttonWidth/2 - 15
      },this.goNext);

      this.$(".right-answer").removeClass("selected");
      this.$(".left-answer").addClass("selected");
    },

    goNext: function() {
      var self = this;
      var h = $(window).height() * 1.3 - $(this.el).height();
      this.$(".next-line").show().animate({ height: h },function() {

        Who.router.navigate("question/" + (self.number+1));
        Who.state.set("question",self.number+1);
      });

    },

    render: function() {

      $(this.el).empty().html(Templates[this.template](this.model.toJSON()));

      return this;
    }

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

  var questions = new Who.QuestionList(_.shuffle([
    { 
      category: "Health Care",
      question: "Should we have universal healthcare?",
      left: 1,
      right: -1,
      background: 'background4'
    },
    { 
      category: "Abortion",
      question: "Should it be illegal to have an abortion?",
      left: -1,
      right: 1
    },
    { 
      category: "Taxation",
      question: "Should the wealthy be asked to pay more in taxes?",
      left: 1,
      right: -1
    },
    { 
      category: "Gay Marriage",
      question: "Should Same-sex couples be legally permitted to marry?",
      left: 1,
      right: -1,
      background: 'background2'
    },
    { 
      category: "Social Security",
      question: "Should the retirement age be increased to reduce the deficit?",
      left: -1,
      right: 1
    },
    { 
      category: "Economy",
      question: "Should corporations pay less in taxes?",
      left: -1,
      right: 1
    },
    { 
      category: "Climate-change",
      question: "Does global warming exist?",
      left: 1,
      right: -1,
      background: 'background3'
    },
    { 
      category: "Green-energy",
      question: "Should Green-energy receive incentives over coal and oil?",
      left: 1,
      right: -1,
      background: 'background5'
    },
    { 
      category: "Military Spending",
      question: "Should the military budget be increased?",
      left: -1,
      right: 1,
      background: 'background1'
    },
    { 
      category: "Foreign Relations",
      question: "Should foreign aid be reduced?",
      left: -1,
      right: 1
    }
  ]));


  Who.state = new Who.QuestionState({

  });

  Who.state.setQuestions(questions);


  var container = new Who.QuestionContainer({ model: Who.state, collection: questions });
  $("#wrapper").append(container.render().el);

  var touchDevice = ('ontouchstart' in document);

  if(touchDevice) {
    $(".bg").remove();
    $("body").on("touchmove",function(e) { e.preventDefault(); });
    setTimeout(function() {
      window.scrollTo(0,1);
    },1);
  } else {
    $("#extra").hide();
  }

  $(window).on('orientationchange',function() {
    window.scrollTo(0,1);
    $(".next-line").height(0);
  });
 

  window.location.hash = "#";

  Who.router = new Who.Router();
  Backbone.history.start();

});
