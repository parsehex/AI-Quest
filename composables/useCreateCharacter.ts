import { STARTER_NAMES } from '~/lib/constants'
import type { PlayerCharacter } from '~/types/Game';

export function useCreateCharacter() {
  const nameInput = ref('')
  const character = ref({
    class: 'Warrior',
    race: '',
    background: 'Noble',
    traits: [],
    skills: [],
    equipment: []
  } as PlayerCharacter);

  const shuffleName = () => {
    const picked = STARTER_NAMES[Math.floor(Math.random() * STARTER_NAMES.length)]
    if (picked === nameInput.value) {
      shuffleName()
    } else {
      nameInput.value = picked
      localStorage.setItem('nickname', nameInput.value);
    }
  }

  const setCharacter = (newCharacter: PlayerCharacter) => {
    character.value = { ...newCharacter }
    localStorage.setItem('playerCharacter', JSON.stringify(newCharacter))
  }

  onMounted(() => {
    const savedName = localStorage.getItem('nickname');
    if (!savedName) return;

    nameInput.value = savedName;

    const savedCharacter = localStorage.getItem('playerCharacter')
    if (savedCharacter) {
      const parsed = JSON.parse(savedCharacter)
      setCharacter(parsed)
    }
  });

  return {
    character,
    setCharacter,
    nameInput,
    shuffleName,
  }
}
