# coding: utf-8
"""Administrator Handlers."""
import webapp2
import logging
import json
import urllib
import hashlib

from models.user import User
from models.institution import Institution
from models.post import Post
from models.post import Comment
from google.appengine.ext import ndb


def add_comments_to_post(user, post, comments_qnt=3):
        """Add comments to post."""
        text_A = {'text': 'Lorem ipsum dolor sit amet, at a. Mauris justo ipsum, \
        mauris justo eget, dolor justo. Aliquet amet, \
        mi tristique. Aliquam suspendisse at.'}
        text_B = {'text': 'Lorem ipsum dolor sit amet, orci id. Eu qui, \
        dui eu curabitur, lacinia justo ante.'}
        text_C = {'text': 'Lorem ipsum dolor sit amet, faucibus nunc neque ridiculus,\
         platea penatibus fusce mattis. Consectetue ut eleifend ipsum,\
         sapien lacinia montes gravida urna, tortor diam aenean diam vel,\
         augue non lacus vivamus. Tempor sollicitudin adipiscing cras, \
         etiam augue quis vestibulum est, tristique sem placerat.  \
         Et ridiculus sapien in pede, senectus diamlorem in vitae, \
         nunc eget adipiscing vestibulum.'}

        texts = []
        texts.append(text_A)
        texts.append(text_B)
        texts.append(text_C)
        comments_qnt = comments_qnt if comments_qnt <= 3 else 3
        for i in range(comments_qnt):
            comment = Comment.create(texts[i], user.key, post.key)
            post.add_comment(comment)


def getGravatar(email):
    """Get Gravatar url."""
    default = "https://www.example.com/default.jpg"
    size = 40
    # construct the url
    gravatar_url = "https://www.gravatar.com/avatar/" + hashlib.md5(email.lower()).hexdigest() + "?"
    gravatar_url += urllib.urlencode({'d': default, 's': str(size)})
    return gravatar_url


class BaseHandler(webapp2.RequestHandler):
    """Base Handler."""

    def handle_exception(self, exception, debug):
        """Exception."""
        logging.error(str(exception))
        self.response.write("oops! %s\n" % str(exception))


class ResetHandler(BaseHandler):
    """Init Handler."""

    def get(self):
        """Reset entities."""

        # Clean the Datastore
        users = User.query().fetch(keys_only=True)
        ndb.delete_multi(users)

        posts = Post.query().fetch(keys_only=True)
        ndb.delete_multi(posts)

        institutions = Institution.query().fetch(keys_only=True)
        ndb.delete_multi(institutions)

        self.response.headers['Content-Type'] = 'application/json; charset=utf-8'
        response = {"msg": "Datastore Cleaned"}
        self.response.write(json.dumps(response))

        # Initialize the datastore
        jsonList = []
        # new User Mayza
        mayza = User()
        mayza.name = 'Mayza Nunes'
        mayza.cpf = '089.675.908-90'
        mayza.email = 'mayzabeel@gmail.com'
        mayza.photo_url = getGravatar(mayza.email)
        mayza.institutions = []
        mayza.follows = []
        mayza.institutions_admin = []
        mayza.notifications = []
        mayza.posts = []
        mayza.put()

        # new User André
        andre = User()
        andre.name = 'André Abrantes'
        andre.cpf = '089.675.908-89'
        andre.email = 'andredossantosabrantes@gmail.com'
        andre.photo_url = getGravatar(andre.email)
        andre.institutions = []
        andre.follows = []
        andre.institutions_admin = []
        andre.notifications = []
        andre.posts = []
        andre.put()

        # new User Jorge
        jorge = User()
        jorge.name = 'Jorge Abrantes'
        jorge.cpf = '089.675.908-10'
        jorge.email = 'abrantes@dsc.ufcg.edu.br'
        jorge.photo_url = 'http://www.ceei.ufcg.edu.br/_/rsrc/1472854148636/AssessoriadeComunicacao/noticias/iforumdegestoresdaufcg/0003.jpg?height=150&width=200'
        jorge.institutions = []
        jorge.follows = []
        jorge.institutions_admin = []
        jorge.notifications = []
        jorge.posts = []
        jorge.put()

        # new User Dalton
        dalton = User()
        dalton.name = 'Dalton Serey'
        dalton.cpf = '089.675.908-20'
        dalton.email = 'dalton@splab.ufcg.edu.br'
        dalton.photo_url = getGravatar(dalton.email)
        dalton.institutions = []
        dalton.follows = []
        dalton.institutions_admin = []
        dalton.notifications = []
        dalton.posts = []
        dalton.put()

        # new User Maiana
        maiana = User()
        maiana.name = 'Maiana Brito'
        maiana.cpf = '089.675.908-65'
        maiana.email = 'maiana.brito@ccc.ufcg.edu.br'
        maiana.photo_url = getGravatar(maiana.email)
        maiana.institutions = []
        maiana.follows = []
        maiana.institutions_admin = []
        maiana.notifications = []
        maiana.posts = []
        maiana.put()

        # new User Raoni
        raoni = User()
        raoni.name = 'Raoni Smaneoto'
        raoni.cpf = '089.675.908-65'
        raoni.email = 'raoni.smaneoto@ccc.ufcg.edu.br'
        raoni.photo_url = getGravatar(raoni.email)
        raoni.institutions = []
        raoni.follows = []
        raoni.institutions_admin = []
        raoni.notifications = []
        raoni.posts = []
        raoni.put()

        # new User Luiz
        luiz = User()
        luiz.name = 'Luiz Silva'
        luiz.cpf = '089.675.908-65'
        luiz.email = 'luiz.silva@ccc.ufcg.edu.br'
        luiz.photo_url = getGravatar(luiz.email)
        luiz.institutions = []
        luiz.follows = []
        luiz.institutions_admin = []
        luiz.notifications = []
        luiz.posts = []
        luiz.put()

        # new User Ruan
        ruan = User()
        ruan.name = 'Ruan Silveira'
        ruan.cpf = '089.675.908-65'
        ruan.email = 'ruan.silveira@ccc.ufcg.edu.br'
        ruan.photo_url = getGravatar(ruan.email)
        ruan.institutions = []
        ruan.follows = []
        ruan.institutions_admin = []
        ruan.notifications = []
        ruan.posts = []
        ruan.put()

        # new User Tiago
        tiago = User()
        tiago.name = 'Tiago Pereira'
        tiago.cpf = '089.675.908-65'
        tiago.email = 'tiago.pereira@ccc.ufcg.edu.br'
        tiago.photo_url = getGravatar(tiago.email)
        tiago.institutions = []
        tiago.follows = []
        tiago.institutions_admin = []
        tiago.notifications = []
        tiago.posts = []
        tiago.put()

        jsonList.append({"msg": "database initialized with a few users"})

        # new Institution CERTBIO with User Mayza like a member and User André like a follower
        certbio = Institution()
        certbio.name = 'CERTBIO'
        certbio.cnpj = '18.104.068/0001-86'
        certbio.legal_nature = 'public'
        certbio.address = 'Universidade Federal de Campina Grande'
        certbio.occupation_area = ''
        certbio.description = 'Ensaio Químico - Determinação de Material Volátil por \
            Gravimetria e Ensaio Biológico - Ensaio de Citotoxicidade'
        certbio.image_url = 'https://pbs.twimg.com/profile_images/1782760873/Logo_do_site_400x400.jpg'
        certbio.email = 'certbio@ufcg.edu.br'
        certbio.phone_number = '(83) 3322 4455'
        certbio.members = [mayza.key, dalton.key]
        certbio.followers = [jorge.key, mayza.key, maiana.key, luiz.key, raoni.key, ruan.key, tiago.key]
        certbio.posts = []
        certbio.admin = mayza.key
        certbio.put()

        # new Institution SPLAB with User André like a member and User Mayza like a follower
        splab = Institution()
        splab.name = 'SPLAB'
        splab.cnpj = '18.104.068/0001-56'
        splab.legal_nature = 'public'
        splab.address = 'Universidade Federal de Campina Grande'
        splab.occupation_area = ''
        splab.description = 'The mission of the Software Practices Laboratory (SPLab) \
            is to promote the development of the state-of-the-art in the \
            theory and practice of Software Engineering.'
        splab.image_url = 'http://amaurymedeiros.com/images/splab.png'
        splab.email = 'splab@ufcg.edu.br'
        splab.phone_number = '(83) 3322 7865'
        splab.members = [jorge.key, andre.key]
        splab.followers = [jorge.key, andre.key, maiana.key, luiz.key, raoni.key, ruan.key, tiago.key]
        splab.posts = []
        splab.admin = jorge.key
        splab.put()

        eciis = Institution()
        eciis.name = 'e-ciis'
        eciis.cnpj = '18.104.068/0001-30'
        eciis.legal_nature = 'public'
        eciis.address = 'Universidade Federal de Campina Grande'
        eciis.occupation_area = ''
        eciis.description = 'The mission of the e-CIIS \
            is to promote the development of the state-of-the-art in the \
            theory and practice of Software Engineering.'
        eciis.image_url = 'http://www.paho.org/bra/images/stories/BRA01A/logobireme.jpg'
        eciis.email = 'eciis@ufcg.edu.br'
        eciis.phone_number = '(83) 3322 7865'
        eciis.members = [dalton.key, andre.key, jorge.key, maiana.key, luiz.key, raoni.key, ruan.key, tiago.key]
        eciis.followers = [mayza.key, andre.key, jorge.key, dalton.key, maiana.key, luiz.key, raoni.key, ruan.key, tiago.key]
        eciis.posts = []
        eciis.admin = dalton.key
        eciis.put()

        jsonList.append({"msg": "database initialized with a few institutions"})


        # Updating Institutions
        mayza.institutions = [certbio.key]
        mayza.follows = [splab.key, eciis.key, certbio.key]
        mayza.institutions_admin = [certbio.key]
        mayza.put()
        andre.institutions = [splab.key, eciis.key]
        andre.follows = [splab.key, eciis.key]
        andre.put()
        jorge.institutions = [splab.key, eciis.key]
        jorge.follows = [certbio.key, splab.key, eciis.key]
        jorge.institutions_admin = [splab.key]
        jorge.put()
        dalton.institutions = [eciis.key, certbio.key]
        dalton.follows = [splab.key, eciis.key]
        dalton.institutions_admin = [eciis.key]
        dalton.put()
        maiana.institutions = [eciis.key]
        maiana.follows = [splab.key, eciis.key, certbio.key]
        maiana.put()
        luiz.institutions = [eciis.key]
        luiz.follows = [splab.key, eciis.key, certbio.key]
        luiz.put()
        raoni.institutions = [eciis.key]
        raoni.follows = [splab.key, eciis.key, certbio.key]
        raoni.put()
        ruan.institutions = [eciis.key]
        ruan.follows = [splab.key, eciis.key, certbio.key]
        ruan.put()
        tiago.institutions = [eciis.key]
        tiago.follows = [splab.key, eciis.key, certbio.key]
        tiago.put()

        # POST of Mayza To Certbio Institution
        mayza_post = Post()
        mayza_post.title = "Novo edital do CERTBIO"
        mayza_post.text = "At vero eos et accusamus et iusto odio dignissimos \
        ducimus qui blanditiis praesentium voluptatum deleniti atque corrupti \
        quos dolores et quas molestias excepturi sint occaecati cupiditate \
        non provident, similique sunt in culpa qui officia deserunt mollitia \
        id est laborum et dolorum fuga. Et harum quidem rerum facilis est et \
        xpedita distinctio. Nam libero tempore, cum soluta nobis est eligendi \
        optio cumque nihil impedit quo minus id quod maxime placeat facere \
        possimus, omnis voluptas assumenda est, omnis dolor repellendus. \
        emporibus autem quibusdam et aut officiis debitis aut rerum \
        necessitatibus saepe eveniet ut et voluptates repudiandae sint \
        et molestiae non recusandae. Itaque earum rerum hic tenetur sapiente \
        delectus, ut aut reiciendis voluptatibus maiores alias consequatur \
        aut perferendis doloribus asperiores repellat."
        mayza_post.author = mayza.key
        mayza_post.institution = certbio.key
        mayza_post.put()
        add_comments_to_post(mayza, mayza_post, 2)

        # POST of Mayza To Certbio Institution with image
        mayza_post_comIMG = Post()
        mayza_post_comIMG.title = "Post do CERTBIO com imagem"
        mayza_post_comIMG.headerImage = "https://workingatbooking.com/content/uploads/2017/04/womenintech_heroimage.jpg"
        mayza_post_comIMG.text = "Lorem ipsum dolor sit amet, consectetur \
        adipiscing elit. Praesent maximus id est in dapibus. Fusce lorem \
        libero, vulputate quis purus maximus, auctor tempus enim. Sed."
        mayza_post_comIMG.author = mayza.key
        mayza_post_comIMG.institution = certbio.key
        mayza_post_comIMG.put()
        add_comments_to_post(mayza, mayza_post_comIMG, 1)

        # POST of André To SPLAB Institution
        andre_post = Post()
        andre_post.title = "Novo edital do SPLAB"
        andre_post.text = "At vero eos et accusamus et iusto odio dignissimos \
        ducimus qui blanditiis praesentium voluptatum deleniti atque corrupti \
        quos dolores et quas molestias excepturi sint occaecati cupiditate non\
        provident, similique sunt in culpa qui officia deserunt mollitia animi\
        id est laborum et dolorum fuga. Et harum quidem rerum facilis est et\
        expedita distinctio. Nam libero tempore, cum soluta nobis est eligen\
        i optio cumque nihil impedit quo minus  quod maxime placeat facere \
        possimus, omnis voluptas assumenda est, omnis dolor repellendus. \
        Temporibus autem quibusdam et aut officiis debitis aut rerum necessi\
        tatibus saepe eveniet ut et voluptates repudiandae sint et molestiae\
        non recusandae. Itaque earum rerum hic tenetur a sapiente delectus,\
        ut aut reiciendis voluptatibus maiores alias consequatur aut perf\
        erendis doloribus asperiores repellat."
        andre_post.author = andre.key
        andre_post.institution = splab.key
        andre_post.put()
        add_comments_to_post(andre, andre_post, 3)

        # POST of Dalton To e-CIIS Institution
        dalton_post = Post()
        dalton_post.title = "Post de Dalton no SPLAB"
        dalton_post.text = "At vero eos et accusamus et iusto odio dignissimos \
        ducimus qui blanditiis praesentium voluptatum deleniti atque corrupti \
        quos dolores  quas molestias excepturi sint occaecati cupiditate non \
        provident, similique sunt  culpa qui officia deserunt mollitia animi,\
        id est laborum et dolorum fuga. Et harum quidem rerum facilis est et \
        expedita distinctio. Nam libero tempore, c soluta nobis est eligendi\
        optio cumque nihil impedit quo minus id quod maxime placeat facere \
        possimus, omnis voluptas assumenda est, omnis dolor repellendus.\
        Temporibusautem quibusdam et aut officiis debitis aut rerum necessitat\
        ibus saepe eveniet ut et voluptates repudiandae sint et molestiae non \
        recusandae. Itaque earum rerum hic tenetur sapiente delectus, ut aut \
        reiciendis voluptatibus maiores alias consequatur aut perferendis dolo\
        ribus asperiores repellat."
        dalton_post.headerImage = "http://noticias.universia.com.br/net/images/consejos-profesionales/l/le/lei/leia-gratuitamente-livros-alcancar-sucesso-noticias.jpg"
        dalton_post.author = dalton.key
        dalton_post.institution = splab.key
        dalton_post.put()
        add_comments_to_post(dalton, dalton_post, 2)

        # POST of Dalton To CERTBIO Institution
        dalton_postCertbio = Post()
        dalton_postCertbio.title = "Post de Dalton no CERTBIO"
        dalton_postCertbio.text = "At vero eos et accusamus et iusto odio dignissimos ducimus qui blanditiis praesentium voluptatum deleniti atque corrupti quos dolores et quas molestias excepturi sint occaecati cupiditate non provident, similique sunt in culpa qui officia deserunt mollitia animi, id est laborum et dolorum fuga. Et harum quidem rerum facilis est et expedita distinctio. Nam libero tempore, cum soluta nobis est eligendi optio cumque nihil impedit quo minus id quod maxime placeat facere possimus, omnis voluptas assumenda est, omnis dolor repellendus. Temporibus autem quibusdam et aut officiis debitis aut rerum necessitatibus saepe eveniet ut et voluptates repudiandae sint et molestiae non recusandae. Itaque earum rerum hic tenetur a sapiente delectus, ut aut reiciendis voluptatibus maiores alias consequatur aut perferendis doloribus asperiores repellat."
        dalton_postCertbio.author = dalton.key
        dalton_postCertbio.institution = certbio.key
        dalton_postCertbio.put()
        add_comments_to_post(dalton, dalton_postCertbio, 1)

        # POST of Jorge To SPLAB Institution
        jorge_post = Post()
        jorge_post.title = "Post de Jorge no SPLAB"
        jorge_post.text = "At vero eos et accusamus et iusto odio dignissimos ducimus qui blanditiis praesentium voluptatum deleniti atque corrupti quos dolores et quas molestias excepturi sint occaecati cupiditate non provident, similique sunt in culpa qui officia deserunt mollitia animi, id est laborum et dolorum fuga. Et harum quidem rerum facilis est et expedita distinctio. Nam libero tempore, cum soluta nobis est eligendi optio cumque nihil impedit quo minus id quod maxime placeat facere possimus, omnis voluptas assumenda est, omnis dolor repellendus. Temporibus autem quibusdam et aut officiis debitis aut rerum necessitatibus saepe eveniet ut et voluptates repudiandae sint et molestiae non recusandae. Itaque earum rerum hic tenetur a sapiente delectus, ut aut reiciendis voluptatibus maiores alias consequatur aut perferendis doloribus asperiores repellat."
        jorge_post.author = jorge.key
        jorge_post.institution = splab.key
        jorge_post.put()

        # POST of Jorge To e-CIIS Institution
        jorge_post_eCIIS = Post()
        jorge_post_eCIIS.title = "Post de Jorge no e-CIIS"
        jorge_post_eCIIS.text = "At vero eos et accusamus et iusto odio dignis\
        simos ducimus quiblanditiis praesentium voluptatum deleniti atque corr\
        pti quos dolores et quas molestias excepturi sint occaecati cupiditate\
        non provident, similique sunt in culpa qui officia deserunt mollitia \
        animi, id est laborum et dolorum fuga. Et harum quidem rerum facilis e\
        et expedita distinctio. Nam libero tempore, cum soluta nobis est elige\
        ndi optio cumque nihil impedit quo minus id quod maxime placeat facere\
        possimus, omnis voluptas assumenda est, omnis dolor repellendus. \
        Temporibus autem quibusdam et aut officiis debitis aut rerum necessit\
        atibus saepe eveniet ut et voluptates repudiandae sint et molestiae \
        non recusandae. Itaque earum rerum hic tenetur a sapiente delectus, \
        ut aut reiciendis voluptatibus maiores alias consequatur aut perferend\
        is doloribus asperiores repellat."
        jorge_post_eCIIS.headerImage = "http://unef.edu.br/hotsite/wp-content/uploads/2016/04/EDITAL.jpg"
        jorge_post_eCIIS.author = jorge.key
        jorge_post_eCIIS.institution = eciis.key
        jorge_post_eCIIS.put()
        add_comments_to_post(jorge, jorge_post_eCIIS, 3)

        # Side efect of a post
        jorge.posts = [jorge_post.key, jorge_post_eCIIS.key]
        jorge.put()

        dalton.posts = [dalton_postCertbio.key, dalton_post.key]
        dalton.put()

        andre.posts = [andre_post.key]
        andre.put()

        mayza.posts = [mayza_post.key, mayza_post_comIMG.key]
        mayza.put()

        eciis.posts = [jorge_post_eCIIS.key, dalton_post.key]
        eciis.put()

        certbio.posts = [dalton_postCertbio.key, mayza_post.key, mayza_post_comIMG.key]
        certbio.put()

        splab.posts = [jorge_post.key, andre_post.key]
        splab.put()

        jsonList.append({"msg": "database initialized with a few posts"})

        self.response.write(json.dumps(jsonList))


app = webapp2.WSGIApplication([
    ('/admin/reset', ResetHandler),
], debug=True)


def erro404(request, response, exception):
    response.write("url invalida: " + str(exception))

app.error_handlers[404] = erro404