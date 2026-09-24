import express, { type Express, type Request, type Response } from "express";
import type { Server } from "http";
import { mockData, paginateResults } from "./mock-data";

const DJANGO_API_URL = process.env.DJANGO_API_URL;
const USE_MOCK_API = !DJANGO_API_URL || DJANGO_API_URL === '';

export async function registerRoutes(
  httpServer: Server,
  app: Express
): Promise<Server> {
  
  if (USE_MOCK_API) {
    console.log('[API] Using mock API data');
    
    app.get('/api/v1/biens/', (req: Request, res: Response) => {
      const { 
        statut_validation, statut_location, ville, type_bien, q, search,
        prix_min, prix_max, nombre_chambres_min,
        eau_courante, electricite, parking, jardin, meuble, climatisation, gardien
      } = req.query;
      let biens = [...mockData.biens];
      
      if (statut_validation) {
        biens = biens.filter(b => b.statut_validation === statut_validation);
      }
      if (statut_location) {
        biens = biens.filter(b => b.statut_location === statut_location);
      }
      if (ville) {
        biens = biens.filter(b => b.ville.toLowerCase().includes(String(ville).toLowerCase()));
      }
      if (type_bien) {
        biens = biens.filter(b => b.type_bien === type_bien);
      }
      const searchQuery = q || search;
      if (searchQuery) {
        const query = String(searchQuery).toLowerCase();
        biens = biens.filter(b => 
          b.titre.toLowerCase().includes(query) ||
          b.ville.toLowerCase().includes(query) ||
          b.quartier.toLowerCase().includes(query)
        );
      }
      if (prix_min) {
        const minPrice = parseInt(String(prix_min));
        biens = biens.filter(b => parseInt(b.prix_mensuel) >= minPrice);
      }
      if (prix_max) {
        const maxPrice = parseInt(String(prix_max));
        biens = biens.filter(b => parseInt(b.prix_mensuel) <= maxPrice);
      }
      if (nombre_chambres_min) {
        const minChambres = parseInt(String(nombre_chambres_min));
        biens = biens.filter(b => b.nombre_chambres >= minChambres);
      }
      if (eau_courante === 'true') {
        biens = biens.filter(b => b.eau_courante === true);
      }
      if (electricite === 'true') {
        biens = biens.filter(b => b.electricite === true);
      }
      if (parking === 'true') {
        biens = biens.filter(b => b.parking === true);
      }
      if (jardin === 'true') {
        biens = biens.filter(b => b.jardin === true);
      }
      if (meuble === 'true') {
        biens = biens.filter(b => b.meuble === true);
      }
      if (climatisation === 'true') {
        biens = biens.filter(b => b.climatisation === true);
      }
      if (gardien === 'true') {
        biens = biens.filter(b => b.gardien === true);
      }
      
      res.json(paginateResults(biens));
    });

    app.get('/api/v1/biens/:id/', (req: Request, res: Response) => {
      const bien = mockData.biens.find(b => b.id === parseInt(req.params.id));
      if (bien) {
        res.json(bien);
      } else {
        res.status(404).json({ detail: 'Bien non trouvé' });
      }
    });

    app.get('/api/v1/biens/:id/avis/', (req: Request, res: Response) => {
      res.json(paginateResults([]));
    });

    app.get('/api/v1/biens/proprietaire/', (req: Request, res: Response) => {
      res.json(paginateResults(mockData.biens.filter(b => b.proprietaire.id === 2)));
    });

    app.get('/api/v1/biens/commissionnaire/', (req: Request, res: Response) => {
      const { statut_validation } = req.query;
      let biens = [...mockData.biens];
      if (statut_validation) {
        biens = biens.filter(b => b.statut_validation === statut_validation);
      }
      res.json(paginateResults(biens));
    });

    app.post('/api/v1/biens/commissionnaire/:id/valider/', (req: Request, res: Response) => {
      const bien = mockData.biens.find(b => b.id === parseInt(req.params.id));
      if (!bien) {
        return res.status(404).json({ detail: 'Bien non trouve' });
      }
      
      const { statut_validation, motif_rejet } = req.body;
      
      if (!statut_validation) {
        return res.status(400).json({ 
          statut_validation: ['Ce champ est requis.'],
          detail: 'Le champ statut_validation ne peut pas etre null'
        });
      }
      
      if (statut_validation === 'rejete') {
        if (!motif_rejet) {
          return res.status(400).json({ 
            motif_rejet: ['Ce champ est requis pour un rejet.'],
            detail: 'Le motif de rejet est requis'
          });
        }
        bien.statut_validation = 'rejete';
        bien.statut_validation_display = 'Rejete';
        bien.motif_rejet = motif_rejet;
        bien.date_validation = new Date().toISOString();
      } else if (statut_validation === 'valide') {
        bien.statut_validation = 'valide';
        bien.statut_validation_display = 'Valide';
        bien.statut_location = 'disponible';
        bien.statut_location_display = 'Disponible';
        bien.motif_rejet = '';
        bien.date_validation = new Date().toISOString();
      } else {
        return res.status(400).json({ 
          statut_validation: [`"${statut_validation}" n'est pas un choix valide.`],
          detail: 'Statut de validation invalide'
        });
      }
      
      res.json(bien);
    });

    app.post('/api/v1/biens/', (req: Request, res: Response) => {
      const newBien = {
        id: mockData.biens.length + 1,
        ...req.body,
        statut_validation: 'en_attente',
        statut_validation_display: 'En attente',
        statut_location: 'indisponible',
        statut_location_display: 'Indisponible',
        proprietaire: mockData.users[1],
        photos: [],
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      };
      mockData.biens.push(newBien as any);
      res.status(201).json(newBien);
    });

    app.post('/api/v1/biens/:id/valider/', (req: Request, res: Response) => {
      const bien = mockData.biens.find(b => b.id === parseInt(req.params.id));
      if (bien) {
        bien.statut_validation = 'valide';
        bien.statut_validation_display = 'Validé';
        bien.statut_location = 'disponible';
        bien.statut_location_display = 'Disponible';
        res.json(bien);
      } else {
        res.status(404).json({ detail: 'Bien non trouvé' });
      }
    });

    app.post('/api/v1/biens/:id/rejeter/', (req: Request, res: Response) => {
      const bien = mockData.biens.find(b => b.id === parseInt(req.params.id));
      if (bien) {
        bien.statut_validation = 'rejete';
        bien.statut_validation_display = 'Rejeté';
        bien.motif_rejet = req.body.motif_rejet;
        res.json(bien);
      } else {
        res.status(404).json({ detail: 'Bien non trouvé' });
      }
    });

    app.post('/api/v1/auth/token/', (req: Request, res: Response) => {
      const { username, password } = req.body;
      const user = mockData.users.find(u => u.username === username);
      if (user && password) {
        res.json({
          access: 'mock-access-token-' + user.id,
          refresh: 'mock-refresh-token-' + user.id,
          user
        });
      } else {
        res.status(401).json({ detail: 'Identifiants incorrects' });
      }
    });

    app.post('/api/v1/auth/login/', (req: Request, res: Response) => {
      const { username, password } = req.body;
      const user = mockData.users.find(u => u.username === username);
      if (user && password) {
        res.json({
          access: 'mock-access-token-' + user.id,
          refresh: 'mock-refresh-token-' + user.id,
          user
        });
      } else {
        res.status(401).json({ detail: 'Identifiants incorrects' });
      }
    });

    app.get('/api/v1/auth/profile/', (req: Request, res: Response) => {
      const authHeader = req.headers.authorization;
      if (authHeader && authHeader.startsWith('Bearer mock-access-token-')) {
        const userId = parseInt(authHeader.split('-').pop() || '1');
        const user = mockData.users.find(u => u.id === userId);
        if (user) {
          res.json(user);
        } else {
          res.status(404).json({ detail: 'Utilisateur non trouvé' });
        }
      } else {
        res.status(401).json({ detail: 'Non authentifié' });
      }
    });

    app.patch('/api/v1/auth/profile/', (req: Request, res: Response) => {
      const authHeader = req.headers.authorization;
      if (authHeader && authHeader.startsWith('Bearer mock-access-token-')) {
        const userId = parseInt(authHeader.split('-').pop() || '1');
        const user = mockData.users.find(u => u.id === userId);
        if (user) {
          Object.assign(user, req.body);
          res.json(user);
        } else {
          res.status(404).json({ detail: 'Utilisateur non trouvé' });
        }
      } else {
        res.status(401).json({ detail: 'Non authentifié' });
      }
    });

    app.post('/api/v1/auth/token/refresh/', (req: Request, res: Response) => {
      const { refresh } = req.body;
      if (refresh && refresh.startsWith('mock-refresh-token-')) {
        const userId = parseInt(refresh.split('-').pop() || '1');
        res.json({ access: 'mock-access-token-' + userId });
      } else {
        res.status(401).json({ detail: 'Token invalide' });
      }
    });

    app.post('/api/v1/auth/register/', (req: Request, res: Response) => {
      const { username, email, first_name, last_name, phone, role, password } = req.body;
      const newUser = {
        id: mockData.users.length + 1,
        username,
        email,
        first_name,
        last_name,
        role: role || 'client',
        role_display: role === 'proprietaire' ? 'Propriétaire' : 'Client',
        phone,
        date_joined: new Date().toISOString(),
        last_login: new Date().toISOString()
      };
      mockData.users.push(newUser as any);
      res.status(201).json({
        access: 'mock-access-token-' + newUser.id,
        refresh: 'mock-refresh-token-' + newUser.id,
        user: newUser
      });
    });

    app.get('/api/v1/auth/agents/', (req: Request, res: Response) => {
      const agents = mockData.users.filter(u => u.role === 'agent');
      res.json(paginateResults(agents));
    });

    app.post('/api/v1/auth/agents/', (req: Request, res: Response) => {
      const { username, email, first_name, last_name, phone, password } = req.body;
      
      if (!username || !email || !first_name || !last_name) {
        res.status(400).json({ detail: 'Tous les champs obligatoires doivent etre remplis' });
        return;
      }
      
      const existingUser = mockData.users.find(u => u.username === username || u.email === email);
      if (existingUser) {
        res.status(400).json({ detail: 'Un utilisateur avec ce nom ou email existe deja' });
        return;
      }
      
      const newAgent = {
        id: mockData.users.length + 1,
        username,
        email,
        first_name,
        last_name,
        role: 'agent' as const,
        role_display: 'Agent',
        phone: phone || '',
        date_joined: new Date().toISOString(),
        last_login: new Date().toISOString()
      };
      mockData.users.push(newAgent as any);
      res.status(201).json(newAgent);
    });

    app.delete('/api/v1/auth/agents/:id/', (req: Request, res: Response) => {
      const agentId = parseInt(req.params.id);
      const agentIndex = mockData.users.findIndex(u => u.id === agentId && u.role === 'agent');
      
      if (agentIndex === -1) {
        res.status(404).json({ detail: 'Agent non trouve' });
        return;
      }
      
      const hasActiveVisites = mockData.visites.some(v => 
        v.agent === agentId && (v.statut === 'planifiee' || v.statut === 'en_cours')
      );
      
      if (hasActiveVisites) {
        res.status(400).json({ detail: 'Impossible de supprimer un agent avec des visites actives' });
        return;
      }
      
      mockData.users.splice(agentIndex, 1);
      res.json({ success: true, message: 'Agent supprime avec succes' });
    });

    app.get('/api/v1/auth/agents/:id/', (req: Request, res: Response) => {
      const agentId = parseInt(req.params.id);
      const agent = mockData.users.find(u => u.id === agentId && u.role === 'agent');
      
      if (agent) {
        res.json(agent);
      } else {
        res.status(404).json({ detail: 'Agent non trouve' });
      }
    });

    app.put('/api/v1/auth/agents/:id/', (req: Request, res: Response) => {
      const agentId = parseInt(req.params.id);
      const agentIndex = mockData.users.findIndex(u => u.id === agentId && u.role === 'agent');
      
      if (agentIndex === -1) {
        res.status(404).json({ detail: 'Agent non trouve' });
        return;
      }
      
      const { email, first_name, last_name, phone } = req.body;
      
      if (email) {
        const existingUser = mockData.users.find(u => u.email === email && u.id !== agentId);
        if (existingUser) {
          res.status(400).json({ detail: 'Un utilisateur avec cet email existe deja' });
          return;
        }
      }
      
      const agent = mockData.users[agentIndex];
      if (email) agent.email = email;
      if (first_name) agent.first_name = first_name;
      if (last_name) agent.last_name = last_name;
      if (phone !== undefined) agent.phone = phone;
      
      res.json(agent);
    });

    app.get('/api/v1/users/me/', (req: Request, res: Response) => {
      const authHeader = req.headers.authorization;
      if (authHeader && authHeader.startsWith('Bearer mock-access-token-')) {
        const userId = parseInt(authHeader.split('-').pop() || '1');
        const user = mockData.users.find(u => u.id === userId);
        if (user) {
          res.json(user);
        } else {
          res.status(404).json({ detail: 'Utilisateur non trouvé' });
        }
      } else {
        res.status(401).json({ detail: 'Non authentifié' });
      }
    });

    app.patch('/api/v1/users/me/', (req: Request, res: Response) => {
      const authHeader = req.headers.authorization;
      if (authHeader && authHeader.startsWith('Bearer mock-access-token-')) {
        const userId = parseInt(authHeader.split('-').pop() || '1');
        const user = mockData.users.find(u => u.id === userId);
        if (user) {
          Object.assign(user, req.body);
          res.json(user);
        } else {
          res.status(404).json({ detail: 'Utilisateur non trouvé' });
        }
      } else {
        res.status(401).json({ detail: 'Non authentifié' });
      }
    });

    app.get('/api/v1/visites/client/demandes/', (req: Request, res: Response) => {
      res.json(paginateResults(mockData.demandesVisite));
    });

    app.post('/api/v1/visites/client/demandes/', (req: Request, res: Response) => {
      const newDemande = {
        id: mockData.demandesVisite.length + 1,
        client: mockData.users[0],
        bien: req.body.bien,
        bien_detail: mockData.biens.find(b => b.id === req.body.bien),
        date_souhaitee: req.body.date_souhaitee,
        heure_souhaitee: req.body.heure_souhaitee,
        message: req.body.message || '',
        statut: 'en_attente',
        statut_display: 'En attente',
        created_at: new Date().toISOString()
      };
      mockData.demandesVisite.push(newDemande as any);
      res.status(201).json(newDemande);
    });

    app.get('/api/v1/visites/commissionnaire/demandes/', (req: Request, res: Response) => {
      res.json(paginateResults(mockData.demandesVisite));
    });

    app.post('/api/v1/visites/commissionnaire/demandes/:id/traiter/', (req: Request, res: Response) => {
      const demande = mockData.demandesVisite.find(d => d.id === parseInt(req.params.id));
      if (demande) {
        const { statut, motif_rejet } = req.body;
        demande.statut = statut;
        demande.statut_display = statut === 'acceptee' ? 'Acceptee' : 'Rejetee';
        if (motif_rejet) {
          demande.motif_rejet = motif_rejet;
        }
        
        const authHeader = req.headers.authorization;
        let commissionnaireId = 3;
        if (authHeader && authHeader.startsWith('Bearer mock-access-token-')) {
          commissionnaireId = parseInt(authHeader.split('-').pop() || '3');
        }
        const commissionnaire = mockData.users.find(u => u.id === commissionnaireId) || mockData.users[2];
        
        demande.traitee_par = commissionnaireId;
        demande.traitee_par_detail = commissionnaire;
        
        let chatRoom = null;
        let firstMessage = null;
        
        if (statut === 'acceptee') {
          const existingChatRoom = mockData.chatRooms.find(c => c.demande_visite === demande.id);
          
          if (!existingChatRoom) {
            const newChatRoom = {
              id: mockData.chatRooms.length + 1,
              demande_visite: demande.id,
              client: demande.client.id,
              client_detail: demande.client,
              commissionnaire: commissionnaireId,
              commissionnaire_detail: commissionnaire,
              agent: null,
              agent_detail: null,
              is_active: true,
              last_message: '',
              unread_count: 1,
              created_at: new Date().toISOString(),
              updated_at: new Date().toISOString()
            };
            mockData.chatRooms.push(newChatRoom as any);
            chatRoom = newChatRoom;
            
            const bienDetail = demande.bien_detail;
            const clientName = `${demande.client.first_name} ${demande.client.last_name}`;
            const propertyTitle = bienDetail?.titre || 'la propriete';
            const location = bienDetail ? `${bienDetail.quartier}, ${bienDetail.ville}` : 'l\'adresse indiquee';
            const commissionnerName = `${commissionnaire.first_name} ${commissionnaire.last_name}`;
            
            const messageContent = `Bonjour ${clientName},

Votre demande de visite pour le bien "${propertyTitle}" situe a ${location} a ete acceptee.

Details de votre demande :
- Date souhaitee : ${demande.date_souhaitee}
- Heure souhaitee : ${demande.heure_souhaitee}
- Bien : ${propertyTitle}
- Adresse : ${location}

Un agent sera assigne a votre visite et vous contactera prochainement pour confirmer les details. N'hesitez pas a poser vos questions dans cette conversation.

Cordialement,
${commissionnerName}`;
            
            const newMessage = {
              id: mockData.messages.length + 1,
              chatroom: newChatRoom.id,
              sender: commissionnaireId,
              sender_detail: commissionnaire,
              content: messageContent,
              is_read: false,
              created_at: new Date().toISOString()
            };
            mockData.messages.push(newMessage as any);
            firstMessage = newMessage;
            
            newChatRoom.last_message = messageContent.substring(0, 50) + '...';
          } else {
            chatRoom = existingChatRoom;
          }
        }
        
        res.json({ 
          ...demande, 
          chatroom: chatRoom,
          first_message: firstMessage
        });
      } else {
        res.status(404).json({ detail: 'Demande non trouvee' });
      }
    });

    app.post('/api/v1/messaging/chatrooms/', (req: Request, res: Response) => {
      const { demande_visite, client, commissionnaire, agent } = req.body;
      
      const existingChatRoom = mockData.chatRooms.find(c => c.demande_visite === demande_visite);
      if (existingChatRoom) {
        res.json(existingChatRoom);
        return;
      }
      
      const clientUser = mockData.users.find(u => u.id === client);
      const commissionnaireUser = mockData.users.find(u => u.id === commissionnaire);
      const agentUser = agent ? mockData.users.find(u => u.id === agent) : null;
      
      if (!clientUser || !commissionnaireUser) {
        res.status(400).json({ detail: 'Client ou commissionnaire invalide' });
        return;
      }
      
      const newChatRoom = {
        id: mockData.chatRooms.length + 1,
        demande_visite: demande_visite,
        client: client,
        client_detail: clientUser,
        commissionnaire: commissionnaire,
        commissionnaire_detail: commissionnaireUser,
        agent: agent || null,
        agent_detail: agentUser,
        is_active: true,
        last_message: '',
        unread_count: 0,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      };
      mockData.chatRooms.push(newChatRoom as any);
      res.status(201).json(newChatRoom);
    });

    app.get('/api/v1/visites/agent/visites/', (req: Request, res: Response) => {
      res.json(paginateResults(mockData.visites));
    });

    app.patch('/api/v1/visites/agent/visites/:id/', (req: Request, res: Response) => {
      const visite = mockData.visites.find(v => v.id === parseInt(req.params.id));
      if (visite) {
        Object.assign(visite, req.body);
        res.json(visite);
      } else {
        res.status(404).json({ detail: 'Visite non trouvée' });
      }
    });

    app.post('/api/v1/visites/agent/visites/:id/rapport/', (req: Request, res: Response) => {
      const visite = mockData.visites.find(v => v.id === parseInt(req.params.id));
      if (visite) {
        (visite as any).rapport = req.body;
        visite.statut = 'terminee';
        visite.statut_display = 'Terminée';
        res.status(201).json({ ...visite, rapport: req.body });
      } else {
        res.status(404).json({ detail: 'Visite non trouvée' });
      }
    });

    app.get('/api/v1/visites/commissionnaire/visites/', (req: Request, res: Response) => {
      res.json(paginateResults(mockData.visites));
    });

    app.post('/api/v1/visites/commissionnaire/visites/', (req: Request, res: Response) => {
      const { demande, agent, date_visite, heure_visite } = req.body;
      const demandeVisite = mockData.demandesVisite.find(d => d.id === demande);
      if (!demandeVisite) {
        res.status(404).json({ detail: 'Demande non trouvee' });
        return;
      }
      const agentUser = agent ? mockData.users.find(u => u.id === agent) : undefined;
      const newVisite = {
        id: mockData.visites.length + 1,
        demande_visite: demande,
        demande_visite_detail: demandeVisite,
        agent: agent || null,
        agent_detail: agentUser || null,
        commissionnaire: 3,
        commissionnaire_detail: mockData.users[2],
        date_visite,
        heure_visite,
        statut: 'planifiee' as const,
        statut_display: 'Planifiee',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      };
      mockData.visites.push(newVisite as any);
      res.status(201).json(newVisite);
    });

    app.post('/api/v1/visites/commissionnaire/visites/:id/reassigner/', (req: Request, res: Response) => {
      const visite = mockData.visites.find(v => v.id === parseInt(req.params.id));
      if (visite) {
        const { agent } = req.body;
        const agentUser = mockData.users.find(u => u.id === agent);
        if (agentUser) {
          visite.agent = agent;
          visite.agent_detail = agentUser;
          visite.updated_at = new Date().toISOString();
          res.json(visite);
        } else {
          res.status(404).json({ detail: 'Agent non trouve' });
        }
      } else {
        res.status(404).json({ detail: 'Visite non trouvee' });
      }
    });

    app.get('/api/v1/visites/commissionnaire/rapports/', (req: Request, res: Response) => {
      res.json(paginateResults(mockData.rapports));
    });

    app.get('/api/v1/messaging/chatrooms/', (req: Request, res: Response) => {
      res.json(paginateResults(mockData.chatRooms));
    });

    app.get('/api/v1/messaging/chatrooms/:id/', (req: Request, res: Response) => {
      const chatroom = mockData.chatRooms.find(c => c.id === parseInt(req.params.id));
      if (chatroom) {
        const messages = mockData.messages.filter(m => m.chatroom === chatroom.id);
        res.json({ ...chatroom, messages });
      } else {
        res.status(404).json({ detail: 'Conversation non trouvée' });
      }
    });

    // Removed mock endpoint - will be proxied to Django

    app.get('/api/v1/notifications/', (req: Request, res: Response) => {
      res.json(paginateResults(mockData.notifications));
    });

    app.post('/api/v1/notifications/:id/read/', (req: Request, res: Response) => {
      const notification = mockData.notifications.find(n => n.id === parseInt(req.params.id));
      if (notification) {
        notification.is_read = true;
        res.json(notification);
      } else {
        res.status(404).json({ detail: 'Notification non trouvée' });
      }
    });

    app.post('/api/v1/notifications/mark-all-read/', (req: Request, res: Response) => {
      mockData.notifications.forEach(n => n.is_read = true);
      res.json({ success: true });
    });

  } else {
    console.log('[API] Proxying to Django API:', DJANGO_API_URL);
    
    // All agent CRUD operations are now proxied directly to Django API
    const { createProxyMiddleware } = await import("http-proxy-middleware");
    
    const proxyMiddleware = createProxyMiddleware({
      target: DJANGO_API_URL,
      changeOrigin: true,
      secure: true,
      // Prepend /api/v1 because Express strips it when mounted on /api/v1
      pathRewrite: (path) => `/api/v1${path}`,
      on: {
        proxyReq: (proxyReq, req) => {
          // Forward authorization header
          const authHeader = req.headers.authorization;
          if (authHeader) {
            proxyReq.setHeader('Authorization', authHeader);
          }
          // Forward content-type
          const contentType = req.headers['content-type'];
          if (contentType) {
            proxyReq.setHeader('Content-Type', contentType);
          }
        },
        proxyRes: (proxyRes, req) => {
          // Seulement le chemin et le statut. La version précédente recopiait
          // le corps des réponses de /auth/agents, /messaging/chatrooms et
          // /favoris/check dans les journaux : coordonnées d'agents et
          // conversations privées en clair.
          const chemin = (req as any).originalUrl || req.url;
          console.log(`[proxy] ${req.method} ${chemin} -> ${proxyRes.statusCode}`);
        },
        error: (err, req, res) => {
          console.error('[proxy] erreur:', err.message);
          if ('writeHead' in res && typeof res.writeHead === 'function') {
            (res as any).writeHead(502, { 'Content-Type': 'application/json' });
            // Le message d'erreur réseau expose l'hôte et le port internes :
            // il reste dans les journaux, il ne part pas vers le navigateur.
            (res as any).end(JSON.stringify({
              error: "L'API est momentanément injoignable.",
            }));
          }
        }
      }
    });
    
    app.use('/api/v1', proxyMiddleware);
  }

  return httpServer;
}
