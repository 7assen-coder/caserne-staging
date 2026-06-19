import random
from django.core.management.base import BaseCommand
from faker import Faker
from etudiants.models import (
    Eleve, ContactParent, DossierSante, DossierAcademique, 
    DossierMilitaire, Hebergement, DocumentEleve
)

fake = Faker(['fr_FR'])  # Generates French-sounding names and data

class Command(BaseCommand):
    help = "Seeds the database with mock student profiles for testing"

    def add_arguments(self, parser):
        parser.add_argument(
            '--total', 
            type=int, 
            default=10, 
            help="Number of students to generate"
        )

    def handle(self, *args, **kwargs):
        total = kwargs['total']
        self.stdout.write(self.style.WARNING(f"Generating {total} mock students..."))

        for _ in range(total):
            # Generate random biographical details
            sexe = random.choice(['H', 'F'])
            prenom = fake.first_name_male() if sexe == 'H' else fake.first_name_female()
            nom = fake.last_name()
            
            # Create the Eleve
            eleve = Eleve.objects.create(
                matricule=random.randint(20000, 26000),
                num_bac=f"BAC-{random.randint(10000, 99999)}",
                nni=f"{random.randint(1000000000, 9999999999)}",
                sexe=sexe,
                prenom=prenom,
                nom_famille=nom,
                date_naissance=fake.date_of_birth(minimum_age=17, maximum_age=25),
                lieu_naissance=fake.city(),
                nationalite="Mauritanienne",
                categorie_bac=random.choice(['National', 'Etranger']),
                serie_bac=random.choice(['C', 'D', 'TMGM']),
                moyenne_bac=round(random.uniform(10.00, 19.50), 2),
                ecole_bac=fake.company() + " High School",
                date_premiere_inscription=fake.date_between(start_date="-3y", end_date="today"),
                voie_acces=random.choice(['1', '2', '3', '4']),
                diplome_acces="Baccalauréat",
                adresse_primaire=fake.address(),
                email_perso=fake.ascii_free_email(),
                tel1=f"{random.choice([2, 3, 4])}{random.randint(1000000, 9999999)}",
            )

            # Create ContactParent
            ContactParent.objects.create(
                eleve=eleve,
                prenom_pere=fake.first_name_male(),
                nom_famille_pere=nom,
                tel_pere="44444444",
                prenom_mere=fake.first_name_female(),
                nom_famille_mere=fake.last_name(),
                tel_urgence="33333333"
            )

            # Create DossierSante (IMC will auto-calculate)
            DossierSante.objects.create(
                eleve=eleve,
                groupe_sanguin=random.choice(['A+', 'B+', 'O+', 'O-']),
                poids_kg=round(random.uniform(50.0, 90.0), 2),
                taille_cm=round(random.uniform(150.0, 195.0), 2),
            )

            # Create DossierAcademique (certains profils mobilité DD / SE)
            niveau = random.choice(['3', '4', '4-DD', '4-E', '5-DD'])
            etab_echange = ''
            etab_dd = ''
            spec_mobilite = ''
            if niveau in ('4-DD', '5-DD'):
                etab_dd = fake.company() + ' University'
                spec_mobilite = random.choice(['Informatique', 'Génie civil', 'Électrotechnique'])
            elif niveau == '4-E':
                etab_echange = fake.company() + ' University'
                spec_mobilite = random.choice(['Data Science', 'Mécanique', 'Réseaux'])
            DossierAcademique.objects.create(
                eleve=eleve,
                departement=random.choice(['IRT', 'SID', 'GE', 'GM', 'GC-HE', 'MPG']),
                niveau_actuel=niveau,
                semestre_actuel=random.choice(['S1', 'S2', 'S3', 'S4']),
                parcours='En cours normal',
                etablissement_echange=etab_echange or None,
                etablissement_double_diplome=etab_dd or None,
                specialite_mobilite=spec_mobilite or None,
            )

            # Create DossierMilitaire (libellés alignés avec COMPAGNIES_OPTIONS côté front)
            DossierMilitaire.objects.create(
                eleve=eleve,
                compagnie=random.choice(['1ʳᵉ Compagnie', '2ᵉ Compagnie']),
                section=f'Section {random.randint(1, 4)}',
                sport_pratique=random.choice(['Football', 'Basketball', 'Athlétisme']),
            )

            # Create Hebergement
            Hebergement.objects.create(
                eleve=eleve,
                batiment=f"Bâtiment {random.choice(['A', 'B', 'C'])}",
                etage=f"Étage {random.randint(0, 3)}",
                aile=random.choice(['Nord', 'Sud', 'Est', 'Ouest']),
                chambre=f"Chambre {random.randint(100, 309)}",
                lit=random.choice(['A', 'B'])
            )

            # Link the Dummy FileBlobs to DocumentEleve
            DocumentEleve.objects.create(
                eleve=eleve,
            )

        self.stdout.write(self.style.SUCCESS(f"Successfully seeded {total} students with full profiles!"))
