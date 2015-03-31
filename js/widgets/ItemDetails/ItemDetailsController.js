﻿/*global define,dojo,Modernizr */
/*jslint browser:true,sloppy:true,nomen:true,unparam:true,plusplus:true */
/*
 | Copyright 2014 Esri
 |
 | Licensed under the Apache License, Version 2.0 (the "License");
 | you may not use this file except in compliance with the License.
 | You may obtain a copy of the License at
 |
 |    http://www.apache.org/licenses/LICENSE-2.0
 |
 | Unless required by applicable law or agreed to in writing, software
 | distributed under the License is distributed on an "AS IS" BASIS,
 | WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 | See the License for the specific language governing permissions and
 | limitations under the License.
 */
define([
    'dojo/_base/declare',
    'dojo/_base/lang',
    'dojo/_base/array',
    'dojo/dom-construct',
    'dojo/dom-style',
    'dojo/dom-class',
    'dojo/dom-attr',
    'dojo/query',
    'dojo/topic',
    'dojo/on',
    'dojo/NodeList-dom',

    'application/lib/SvgHelper',

    'dijit/layout/ContentPane',

    'dijit/_WidgetBase',
    'dijit/_TemplatedMixin',

    "application/widgets/DynamicForm/DynamicForm",
    "application/widgets/PopupWindow/PopupWindow",

    'dojo/text!./ItemDetailsView.html'
], function (declare, lang, arrayUtil, domConstruct, domStyle, domClass, domAttr, dojoQuery, topic, dojoOn, nld,
    SvgHelper,
    ContentPane,
    _WidgetBase, _TemplatedMixin,
    DynamicForm, PopupWindow,
    template) {

    return declare([_WidgetBase, _TemplatedMixin], {
        templateString: template,
        id: 'itemDetail',
        baseClass: 'itemDetail',
        itemTitle: 'default title',
        itemVotes: null,
        actionVisibilities: {
            "showVotes": false,
            "showComments": false,
            "showGallery": false
        },
        votesField: null,
        commentFields: null,


        constructor: function () {
            this.inherited(arguments);
        },

        postCreate: function () {
            this.inherited(arguments);
            this.i18n = this.appConfig.i18n.item_details;
            this.initCommentsDiv();
            this.initContentPane();
            this.hide();
        },

        startup: function () {
            this.inherited(arguments);
            this.initTemplateIcons();
            this.addListeners();
        },

        show: function () {
            if (!this.actionVisibilities.showVotes || !this.votesField) {
                domStyle.set(this.likeButton, 'display', 'none');
            }
            if (!this.actionVisibilities.showComments || !this.commentFields) {
                domStyle.set(this.commentButton, 'display', 'none');
                domStyle.set(this.commentsHeading, 'display', 'none');
                domStyle.set(this.noCommentsDiv, 'display', 'none');
                domStyle.set(this.commentsList, 'display', 'none');
            }
            domStyle.set(this.domNode, 'display', '');
        },

        hide: function () {
            domStyle.set(this.domNode, 'display', 'none');
            this.hideCommentForm();
        },

        /**
         * Creates the icons for the Like, Comment, Gallery buttons and gives them their
         * i18n labels and tooltips.
         * <br>Needs to be run after postCreate, such as in startup, because of SVG icons; see
         * https://code.google.com/p/tatami/issues/detail?id=40
         */
        initTemplateIcons: function () {
            var gallerySurface, backIconSurface, self = this;

            arrayUtil.forEach(dojoQuery('.favIcon', this.domNode), function (iconDiv) {
                SvgHelper.changeColor(SvgHelper.createSVGItem(self.appConfig.likeIcon, iconDiv, 12, 12),
                    self.appConfig.theme.accentText);
            });
            this.likeLabel.innerHTML = this.i18n.likeButtonLabel;
            this.likeButton.title = this.i18n.likeButtonTooltip;

            backIconSurface = SvgHelper.createSVGItem(this.appConfig.backIcon, this.backIcon, 12, 20);
            if (!Modernizr.rgba) {
                SvgHelper.changeColor(backIconSurface, this.appConfig.theme.foreground);
            }

            SvgHelper.createSVGItem(this.appConfig.commentIcon, this.commentIcon, 11, 10);
            this.commentLabel.innerHTML = this.i18n.commentButtonLabel;
            this.commentButton.title = this.i18n.commentButtonTooltip;

            gallerySurface = SvgHelper.createSVGItem(this.appConfig.galleryIcon, this.galleryIcon, 14, 13);
            this.galleryLabel.innerHTML = this.i18n.galleryButtonLabel;
            this.galleryButton.title = this.i18n.galleryButtonTooltip;
            domAttr.set(gallerySurface.rawNode, 'viewBox', '300.5, 391, 11, 10');
        },

        /**
         * Sets up the i18n comments-list heading and the no-comments planceholder.
         */
        initCommentsDiv: function () {
            this.commentsHeading.innerHTML = this.i18n.commentsListHeading;
            this.noCommentsDiv.innerHTML = this.i18n.noCommentsPlaceholder;
        },

        addListeners: function () {
            var self = this;
            dojoOn(this.backIcon, 'click', function () {
                topic.publish('detailsCancel');
            });
            dojoOn(this.likeButton, 'click', function () {
                topic.publish('addLike', self.item);
            });
            dojoOn(this.commentButton, 'click', function () {
                topic.publish('getComment', self.item);
            });
            dojoOn(this.galleryButton, 'click', lang.hitch(this, function () {
                topic.publish('showGallery', self.item);
                if (domStyle.get(this.gallery, 'display') === 'none') {
                    this.showGallery();
                } else {
                    this.hideGallery();
                }
            }));
        },


        /**
         * Sets the fields that are needed to display feature information in this list (number of votes).
         * Needs to be called before first setItems to tell the widget which fields to look for.
         * @param {string} votesField Name of votes property
         * @param {array} commentFields Fields used by comment-entry form
         */
        setItemFields: function (votesField, commentFields) {
            this.votesField = votesField;
            this.commentFields = commentFields;
        },

        /**
         * Sets the
         */
        setActionsVisibility: function (showVotes, showComments, showGallery) {
            this.actionVisibilities = {
                "showVotes": showVotes,
                "showComments": showComments,
                "showGallery": showGallery
            };
        },

        initContentPane: function () {
            this.itemCP = new ContentPane({id: 'itemCP'}, this.descriptionDiv);
            this.itemCP.startup();
        },

        setItem: function (item) {
            this.item = item;
            this.clearGallery();

            this.itemTitle = this.getItemTitle(item) || "&nbsp;";
            this.itemVotes = this.getItemVotes(item);
            this.clearItemDisplay();
            this.buildItemDisplay();
        },

        /**
         * Updates the definition and display of the current item.
         * @param {object} item Updated definition of current item
         */
        updateItemVotes: function (item) {
            if (item === this.item) {
                this.itemVotes = this.getItemVotes(item);
                this.redrawItemVotes();
            }
        },

        redrawItemVotes: function () {
            if (this.itemVotes) {
                if (this.itemVotes.needSpace) {
                    domClass.add(this.itemTitleDiv, "itemDetailTitleOverride");
                }
                this.itemVotesDiv.innerHTML = this.itemVotes.label;
            } else {
                domStyle.set(this.itemVotesGroup, 'display', 'none');
            }
        },

        setAttachments: function (attachments) {
            var showGalleryButton =
                this.actionVisibilities.showGallery && attachments && attachments.length > 0;
            if (showGalleryButton) {
                if (!this.enlargedViewPopup) {
                    // Popup window for enlarged image
                    this.enlargedViewPopup = new PopupWindow({
                        "appConfig": this.appConfig,
                        "showClose": true
                    }).placeAt(document.body); // placeAt triggers a startup call to _helpDialogContainer
                }

                this.updateGallery(attachments);
                domStyle.set(this.galleryButton, 'display', 'inline-block');
            }
        },

        updateGallery: function (attachments) {
            // Create gallery
            arrayUtil.forEach(attachments, lang.hitch(this, function (attachment) {
                var thumb, srcURL;
                srcURL = attachment.url + "/" + attachment.name;
                thumb = domConstruct.create('img', {
                    'class': 'attachment',
                    'src': srcURL
                }, this.gallery);
                dojoOn(thumb, 'click', lang.hitch(this, function (attachment) {
                    domConstruct.empty(this.enlargedViewPopup.popupContent);
                    domConstruct.create('img', {
                        'class': 'attachment',
                        'src': srcURL
                    }, this.enlargedViewPopup.popupContent);
                    this.enlargedViewPopup.show();
                }));
            }));
        },

        clearGallery: function () {
            domStyle.set(this.galleryButton, 'display', 'none');
            this.hideGallery();
            domConstruct.empty(this.gallery);
        },

        showGallery: function () {
            domStyle.set(this.gallery, 'display', 'block');
        },

        hideGallery: function () {
            domStyle.set(this.gallery, 'display', 'none');
            this.galleryLabel.innerHTML = this.i18n.galleryButtonLabel;
        },

        showCommentForm: function (userInfo) {
            if (this.commentFields) {
                if (!this.itemAddComment) {
                    // Create comment form
                    this.itemAddComment = new DynamicForm({
                        "appConfig": this.appConfig
                    }).placeAt(this.commentsForm); // placeAt triggers a startup call to itemAddComment

                    // Set its item and its fields
                    this.itemAddComment.setItem(this.item);
                    this.itemAddComment.setFields(this.commentFields);

                    // See if we can pre-set its user name value
                    if (userInfo && userInfo.name && this.appConfig.commentNameField && this.appConfig.commentNameField.length > 0) {
                        this.itemAddComment.presetFieldValue(this.appConfig.commentNameField, userInfo.name);
                    }
                }

                // Show the form
                this.itemAddComment.show();
            }
        },

        hideCommentForm: function () {
            if (this.itemAddComment) {
                this.itemAddComment.destroy();
                this.itemAddComment = null;
            }
        },

        /**
         * Gets title of feature for header display
         * @param  {feature} item The feature for which to get the title
         * @return {string}      The title of the feature
         */
        getItemTitle: function (item) {
            return item.getTitle ? item.getTitle() : "";
        },

        /**
         * Gets the number of votes for an item
         * @param  {feature} item The feature for which to get the vote count
         * @return {object} Object containing "label" with vote count for the item in a shortened form (num if <1000,
         * floor(count/1000)+"k" if <1M, floor(count/1000000)+"M" otherwise) and "needSpace" that's indicates if an
         * extra digit of room is needed to handle numbers between 99K and 1M, exclusive
         */
        getItemVotes: function (item) {
            var needSpace = false, votes;

            if (this.votesField) {
                votes = item.attributes[this.votesField] || 0;
                if (votes > 999) {
                    if (votes > 99999) {
                        needSpace = true;
                    }
                    if (votes > 999999) {
                        votes = Math.floor(votes / 1000000) + "M";
                    } else {
                        votes = Math.floor(votes / 1000) + "k";
                    }
                }
                return {
                    "label": votes,
                    "needSpace": needSpace
                };
            }
            return null;
        },

        clearItemDisplay: function () {
            this.itemTitleDiv.innerHTML = '';
            this.itemVotesDiv.innerHTML = '';
            this.itemCP.set('content', '');
        },

        buildItemDisplay: function () {
            this.itemTitleDiv.innerHTML = this.itemTitle;
            this.redrawItemVotes();
            this.itemCP.set('content', this.item.getContent());
        },

        setComments: function (commentsArr) {
            this.clearComments();
            domClass.toggle(this.noCommentsDiv, 'hide', commentsArr.length);
            arrayUtil.forEach(commentsArr, lang.hitch(this, this.buildCommentDiv));

        },

        /**
         * Creates a ContentPane to hold the contents of a comment.
         * @param {object} comment Comment to display; its contents come from calling
         * getContent() on it
         */
        buildCommentDiv: function (comment) {
            var commentDiv;

            commentDiv = domConstruct.create('div', {
                'class': 'comment'
            }, this.commentsList);

            new ContentPane({
                'class': 'content small-text',
                'content': comment.getContent()
            }, commentDiv).startup();
        },

        /**
         * Empties the list of comments.
         */
        clearComments: function () {
            domConstruct.empty(this.commentsList);
        }
    });
});
