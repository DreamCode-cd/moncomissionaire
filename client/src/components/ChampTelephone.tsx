import { forwardRef, useEffect, useState } from 'react';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { assembler, decouper, PAYS } from '@shared/telephone';

interface ChampTelephoneProps {
  /** Le numéro complet, « +243812345678 », tel que l'API le stocke. */
  value: string;
  onChange: (numero: string) => void;
  onBlur?: () => void;
  name?: string;
  'data-testid'?: string;
}

/**
 * Indicatif du pays et numéro, côte à côte.
 *
 * L'indicatif était à taper dans le champ, au milieu du numéro : la moitié des
 * saisies arrivaient sans lui, ou avec un « 0 » en trop. Le numéro tapé reste
 * affiché tel quel (espaces compris) ; seul le numéro assemblé remonte au
 * formulaire.
 */
export const ChampTelephone = forwardRef<HTMLInputElement, ChampTelephoneProps>(
  ({ value, onChange, onBlur, name, 'data-testid': testId }, ref) => {
    const [indicatif, setIndicatif] = useState(() => decouper(value).indicatif);
    const [saisie, setSaisie] = useState(() => decouper(value).national);

    // Formulaire remis à zéro ou rechargé depuis le profil : on se recale.
    useEffect(() => {
      if (assembler(indicatif, saisie) !== (value ?? '')) {
        const { indicatif: i, national } = decouper(value);
        setIndicatif(i);
        setSaisie(national);
      }
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [value]);

    return (
      <div className="flex gap-2">
        <Select
          value={indicatif}
          onValueChange={(nouveau) => {
            setIndicatif(nouveau);
            onChange(assembler(nouveau, saisie));
          }}
        >
          <SelectTrigger className="w-[6.5rem] shrink-0" aria-label="Indicatif du pays" data-testid="select-indicatif">
            {/* Le bouton ne montre que l'indicatif ; le nom du pays est dans
                la liste. « +243 RD… » tronqué ne disait rien. */}
            <SelectValue>+{indicatif}</SelectValue>
          </SelectTrigger>
          <SelectContent>
            {PAYS.map((pays) => (
              <SelectItem key={pays.indicatif} value={pays.indicatif}>
                +{pays.indicatif} {pays.nom}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Input
          ref={ref}
          name={name}
          type="tel"
          inputMode="tel"
          autoComplete="tel-national"
          maxLength={18}
          value={saisie}
          onChange={(e) => {
            setSaisie(e.target.value);
            onChange(assembler(indicatif, e.target.value));
          }}
          onBlur={() => {
            // Numéro collé avec son indicatif : on le range dans la liste en
            // quittant le champ, pas pendant la frappe, pour ne rien déplacer
            // sous les doigts.
            // Un indicatif hors de la liste (« +44… ») reste tel quel dans le
            // champ : decouper le rangerait sous +243.
            const numero = assembler(indicatif, saisie);
            const rangement = decouper(numero);
            if (/^(\+|00)/.test(saisie.trim()) && numero.startsWith(`+${rangement.indicatif}`)) {
              setIndicatif(rangement.indicatif);
              setSaisie(rangement.national);
            }
            onBlur?.();
          }}
          data-testid={testId}
        />
      </div>
    );
  },
);
ChampTelephone.displayName = 'ChampTelephone';
