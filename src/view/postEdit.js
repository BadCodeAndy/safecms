const random = require('../util/random');
const file = require('../data/file');
const path = require('path');

class postEdit {
    constructor() {
        this.dependencies = ['page'];
        this.render = this.render.bind(this);
        this.remove = this.remove.bind(this);
        this.safeDraftPost = this.safeDraftPost.bind(this);
    }

    render() {
        let post = window.state.activePost,
            postStatusText = !post || post.status === 0 ? 'draft' : (post.status === 1 ? 'published' : 'edited'),
            postDomain = !post || !post.networkPath ? false : post.networkPath,
            domainOptionsHTML = '';

        window.state.activePost = false;

        for (let i = 0; i < window.state.cachedDomains.length; i++) {
            let d = window.state.cachedDomains[i];

            for (let s = 0; s < d.services.length; s++) {
                let networkPath = `_public/` + d.name + `/root-` + d.services[s].name + `/`;
                domainOptionsHTML += `<option value="` + networkPath + `" ` + (networkPath === postDomain ? "selected" : '') + `>safe://` + d.services[s].name + `.` + d.name + `</option>`;
            }
        }

        window.jquery('.page .content').html(
            `<div class="post-edit">
                <div class="post-content">
                    <form action="" method="POST">
                        <div><label>Post Title</label></div>
                        <input type="text" id="post-title" name="title" placeholder="Post title" value="` + (post ? post.title : '') + `" />
                        <div><label>Post Domain</label></div>
                        <select name="post-domain">` + (domainOptionsHTML.length ? domainOptionsHTML : '<option disabled>Please create a domain and service on the Domains page</option>') + `</select>
                        <div><label>Post URL</label></div>
                        <input class="slug active" type="text" id="post-slug" name="slug" placeholder="Post URL" value="` + (post ? post.slug : '') + `" />
                        <div><label>Post Content</label></div>
                        <div class="editor" id="post-editor" data-placeholder="Start writing your post">` + (post ? post.content : '<p>Some example content to edit</p>') + `</div>
                    </form>
                </div>
                <div class="post-meta">
                    <div class="post-meta-indicator">
                        <div class="indicator-bar-background"></div>
                        <div class="indicator-bar ` + postStatusText + `"></div>
                        <div class="indicator-item active">Draft</div>
                        <div class="indicator-item ` + (post && post.status > 0 ? 'active' : '') + `">Published</div>
                        <div class="indicator-item ` + (post && post.status > 1 ? 'active' : '') + `">Edited</div>
                    </div>
                    <div class="post-controls">
                        <div class="button save-draft">Save draft</div>
                        <div class="button green publish">Publish to SafeNet</div>
                    </div>
                </div>
            </div>`
        );

        new MediumEditor('#post-editor');

        window.jquery('.post-edit .slug-trigger').on('click', function(){
            window.jquery('.post-edit .slug-trigger').removeClass('active');
            window.jquery('.post-edit #post-slug').addClass('active');
        });

        let tempThis = this;
        window.jquery('.post-edit .post-controls .save-draft').on('click', function(){
            tempThis.safeDraftPost(post, function() {
                window.controller.renderView('postEditSuccess');
            })
        });

        window.jquery('.post-edit .post-controls .publish').on('click', function() {
            tempThis.safeDraftPost(post, function() {
                post = window.state.activePost;
                
                if (!post.slug || !post.slug.length) {
                    alert('Please add a valid post URL before attempting to publish');
                    return;
                }

                window.safe.uploadFile(file.getPath('posts' + path.sep + post.id + '.html'), post.networkPath + post.slug + '.html')
                    .then(ddd => {
                        alert('Your post was successfully saved');
                    });
            });
        });
    }

    remove() {
        window.jquery('.post-edit .slug-trigger').off('click');
        window.jquery('.post-edit .post-controls .save-draft').off('click');
        window.jquery('.post-edit .post-controls .publish').off('click');
        window.jquery('.page .content').remove('.post-edit');
    }

    safeDraftPost(post, callback) {
        if (!post) {
            post = {
                id: random.getRandomString(16),
                status: 0
            }
        }

        post.title = window.jquery('.post-edit #post-title').val();
        post.slug = window.jquery('.post-edit #post-slug').val();
        post.content = window.jquery('.post-edit #post-editor').html();
        post.networkPath = window.jquery('.post-edit select[name="post-domain"]').val();

        let dateOptions = {weekday: "short", year: "numeric", month: "short", day: "numeric", hour: "2-digit", minute: "2-digit"};
        post.lastModified = (new Date).toLocaleDateString('en-us', dateOptions);

        let currentPosts = window.state.posts.get('list');

        for (let i = 0; i < currentPosts.length; i++) {
            if (currentPosts[i].id === post.id) {
                currentPosts.splice(i, 1);
            }
        }

        currentPosts.unshift(post);

        window.state.posts.set('list', currentPosts);
        window.state.activePost = post;

        file.createDirectory('posts');
        window.state.posts.save(function(){
            file.createFile('posts' + path.sep + post.id + '.html', '<div id="c">' + post.content + '</div><script type="text/javascript" src="/template.js"></script>', callback);
        });
    }
}

module.exports = new postEdit;