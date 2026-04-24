from django.db import models

class Eleve(models.Model):
    CHOIX_SEXE = [('H', 'Homme'), ('F', 'Femme')]
    CHOIX_CATEGORIE_BAC = [('National', 'National'), ('Etranger', 'Etranger')]

    # Informations générales
    matricule = models.CharField(max_length=50, unique=True)
    num_bac = models.CharField(max_length=50)
    nni = models.CharField(max_length=50, unique=True)
    sexe = models.CharField(max_length=1, choices=CHOIX_SEXE)
    prenom = models.CharField(max_length=100)
    nom_famille = models.CharField(max_length=100)
    date_naissance = models.DateField()
    lieu_naissance = models.CharField(max_length=100)
    nationalite = models.CharField(max_length=100)
    
    categorie_bac = models.CharField(max_length=50, choices=CHOIX_CATEGORIE_BAC)
    serie_bac = models.CharField(max_length=100)
    moyenne_bac = models.DecimalField(max_digits=5, decimal_places=2)
    ecole_bac = models.CharField(max_length=150)
    
    annee_premiere_inscription = models.CharField(max_length=9) # ex: 2023-2024
    date_premiere_inscription = models.DateField()
    voie_acces = models.CharField(max_length=100)
    diplome_acces = models.CharField(max_length=100)
    etablissement_diplome = models.CharField(max_length=150, blank=True, null=True)
    
    adresse_primaire = models.TextField()
    adresse_secondaire = models.TextField(blank=True, null=True)
    resident_avec_parents = models.BooleanField(default=True)
    compte_bankily = models.CharField(max_length=50, blank=True, null=True)

    # Contacts de l'élève
    email_pro = models.EmailField(blank=True, null=True)
    email_perso = models.EmailField()
    tel1 = models.CharField(max_length=20)
    tel2_whatsapp = models.CharField(max_length=20, blank=True, null=True)
    facebook = models.CharField(max_length=150, blank=True, null=True)
    linkedin = models.CharField(max_length=150, blank=True, null=True)

    def __str__(self):
        return f"{self.prenom} {self.nom_famille} - {self.matricule}"


class ContactParent(models.Model):
    eleve = models.OneToOneField(Eleve, on_delete=models.CASCADE, related_name='contacts_parents')
    
    prenom_pere = models.CharField(max_length=100)
    fonction_pere = models.CharField(max_length=100, blank=True, null=True)
    tel_pere = models.CharField(max_length=20, blank=True, null=True)
    tel_pere_whatsapp = models.CharField(max_length=20, blank=True, null=True)
    
    prenom_mere = models.CharField(max_length=100)
    nom_famille_mere = models.CharField(max_length=100)
    fonction_mere = models.CharField(max_length=100, blank=True, null=True)
    tel_mere = models.CharField(max_length=20, blank=True, null=True)
    tel_mere_whatsapp = models.CharField(max_length=20, blank=True, null=True)
    
    contact_urgence = models.CharField(max_length=100) # (Père, Mère, Autre)
    nom_urgence = models.CharField(max_length=150, blank=True, null=True)
    tel_urgence = models.CharField(max_length=20, blank=True, null=True)
    tel_urgence_whatsapp = models.CharField(max_length=20, blank=True, null=True)

    def __str__(self):
        return f"Contacts de {self.eleve.matricule}"


class DossierSante(models.Model):
    eleve = models.OneToOneField(Eleve, on_delete=models.CASCADE, related_name='dossier_sante')
    groupe_sanguin = models.CharField(max_length=5)
    assureur = models.CharField(max_length=100, blank=True, null=True)
    num_assure = models.CharField(max_length=100, blank=True, null=True)
    antecedents_medicaux = models.TextField(blank=True, null=True)
    maladies_chroniques = models.TextField(blank=True, null=True)
    medicaments_a_vie = models.TextField(blank=True, null=True)
    poids_kg = models.DecimalField(max_digits=5, decimal_places=2, blank=True, null=True)
    taille_cm = models.DecimalField(max_digits=5, decimal_places=2, blank=True, null=True)
    imc = models.DecimalField(max_digits=5, decimal_places=2, blank=True, null=True)


class DossierAcademique(models.Model):
    eleve = models.OneToOneField(Eleve, on_delete=models.CASCADE, related_name='dossier_academique')
    departement = models.CharField(max_length=100)
    niveau_actuel = models.CharField(max_length=50) # 1ère année, 2e année, 3eme année
    semestre_actuel = models.CharField(max_length=50)
    
    # S1 à S6 info (simplifié via JSONField pour stocker toutes les années/validations)
    donnees_semestres = models.JSONField(default=dict, blank=True, null=True)
    
    diplome = models.CharField(max_length=100, blank=True, null=True)
    etablissement_echange = models.CharField(max_length=150, blank=True, null=True)
    etablissement_double_diplome = models.CharField(max_length=150, blank=True, null=True)
    specialite_mobilite = models.CharField(max_length=150, blank=True, null=True)
    parcours = models.CharField(max_length=100) # En cours normal, redoublant, renvoyé


class DossierMilitaire(models.Model):
    eleve = models.OneToOneField(Eleve, on_delete=models.CASCADE, related_name='dossier_militaire')
    compagnie = models.CharField(max_length=100)
    section = models.CharField(max_length=100)
    sport_pratique = models.CharField(max_length=100)
    
    # Mensurations
    tour_poitrine = models.DecimalField(max_digits=5, decimal_places=2, blank=True, null=True)
    tour_ceinture = models.DecimalField(max_digits=5, decimal_places=2, blank=True, null=True)
    tour_taille = models.DecimalField(max_digits=5, decimal_places=2, blank=True, null=True)
    tour_bassin = models.DecimalField(max_digits=5, decimal_places=2, blank=True, null=True)
    tour_cou = models.DecimalField(max_digits=5, decimal_places=2, blank=True, null=True)
    longueur_manche = models.DecimalField(max_digits=5, decimal_places=2, blank=True, null=True)
    longueur_dos = models.DecimalField(max_digits=5, decimal_places=2, blank=True, null=True)
    longueur_cote = models.DecimalField(max_digits=5, decimal_places=2, blank=True, null=True)
    pointure = models.IntegerField(blank=True, null=True)


class Hebergement(models.Model):
    eleve = models.OneToOneField(Eleve, on_delete=models.CASCADE, related_name='hebergement')
    batiment = models.CharField(max_length=100)
    etage = models.CharField(max_length=50)
    aile = models.CharField(max_length=50)
    chambre = models.CharField(max_length=50)
    lit = models.CharField(max_length=50)
    responsable_chambre = models.BooleanField(default=False)
    responsable_aile = models.BooleanField(default=False)
    responsable_etage = models.BooleanField(default=False)


class DocumentEleve(models.Model):
    eleve = models.OneToOneField(Eleve, on_delete=models.CASCADE, related_name='documents')
    cin = models.FileField(upload_to='documents/cin/', blank=True, null=True)
    acte_naissance = models.FileField(upload_to='documents/acte_naissance/', blank=True, null=True)
    diplome_acces = models.FileField(upload_to='documents/diplome_acces/', blank=True, null=True)
    diplome_bac = models.FileField(upload_to='documents/diplome_bac/', blank=True, null=True)
    photo_identite_militaire = models.ImageField(upload_to='documents/photos/militaire/', blank=True, null=True)
    photo_identite_civile = models.ImageField(upload_to='documents/photos/civile/', blank=True, null=True)
    photo_militaire_integrale = models.ImageField(upload_to='documents/photos/integrale/', blank=True, null=True)
