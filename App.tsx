import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Modal,
  Alert,
  StatusBar,
  Platform,
  BackHandler,
  KeyboardAvoidingView,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import AsyncStorage from '@react-native-async-storage/async-storage';

// Types and Interfaces
interface BibleBook {
  name: string;
  chapters: number;
}

interface ReadingSession {
  id: string;
  name: string;
  completedChapters: { [key: string]: boolean };
  createdAt: string;
  startDate?: string; // Optional for backward compatibility
  hideCompletedBooks?: boolean; // Remember filter state per session
}

interface BookProgress {
  completed: number;
  total: number;
}

// Bible books with chapter counts
const BIBLE_BOOKS: BibleBook[] = [
  { name: 'Genesis', chapters: 50 },
  { name: 'Exodus', chapters: 40 },
  { name: 'Leviticus', chapters: 27 },
  { name: 'Numbers', chapters: 36 },
  { name: 'Deuteronomy', chapters: 34 },
  { name: 'Joshua', chapters: 24 },
  { name: 'Judges', chapters: 21 },
  { name: 'Ruth', chapters: 4 },
  { name: '1 Samuel', chapters: 31 },
  { name: '2 Samuel', chapters: 24 },
  { name: '1 Kings', chapters: 22 },
  { name: '2 Kings', chapters: 25 },
  { name: '1 Chronicles', chapters: 29 },
  { name: '2 Chronicles', chapters: 36 },
  { name: 'Ezra', chapters: 10 },
  { name: 'Nehemiah', chapters: 13 },
  { name: 'Esther', chapters: 10 },
  { name: 'Job', chapters: 42 },
  { name: 'Psalms', chapters: 150 },
  { name: 'Proverbs', chapters: 31 },
  { name: 'Ecclesiastes', chapters: 12 },
  { name: 'Song of Solomon', chapters: 8 },
  { name: 'Isaiah', chapters: 66 },
  { name: 'Jeremiah', chapters: 52 },
  { name: 'Lamentations', chapters: 5 },
  { name: 'Ezekiel', chapters: 48 },
  { name: 'Daniel', chapters: 12 },
  { name: 'Hosea', chapters: 14 },
  { name: 'Joel', chapters: 3 },
  { name: 'Amos', chapters: 9 },
  { name: 'Obadiah', chapters: 1 },
  { name: 'Jonah', chapters: 4 },
  { name: 'Micah', chapters: 7 },
  { name: 'Nahum', chapters: 3 },
  { name: 'Habakkuk', chapters: 3 },
  { name: 'Zephaniah', chapters: 3 },
  { name: 'Haggai', chapters: 2 },
  { name: 'Zechariah', chapters: 14 },
  { name: 'Malachi', chapters: 4 },
  { name: 'Matthew', chapters: 28 },
  { name: 'Mark', chapters: 16 },
  { name: 'Luke', chapters: 24 },
  { name: 'John', chapters: 21 },
  { name: 'Acts', chapters: 28 },
  { name: 'Romans', chapters: 16 },
  { name: '1 Corinthians', chapters: 16 },
  { name: '2 Corinthians', chapters: 13 },
  { name: 'Galatians', chapters: 6 },
  { name: 'Ephesians', chapters: 6 },
  { name: 'Philippians', chapters: 4 },
  { name: 'Colossians', chapters: 4 },
  { name: '1 Thessalonians', chapters: 5 },
  { name: '2 Thessalonians', chapters: 3 },
  { name: '1 Timothy', chapters: 6 },
  { name: '2 Timothy', chapters: 4 },
  { name: 'Titus', chapters: 3 },
  { name: 'Philemon', chapters: 1 },
  { name: 'Hebrews', chapters: 13 },
  { name: 'James', chapters: 5 },
  { name: '1 Peter', chapters: 5 },
  { name: '2 Peter', chapters: 3 },
  { name: '1 John', chapters: 5 },
  { name: '2 John', chapters: 1 },
  { name: '3 John', chapters: 1 },
  { name: 'Jude', chapters: 1 },
  { name: 'Revelation', chapters: 22 },
];

const TOTAL_CHAPTERS: number = BIBLE_BOOKS.reduce((sum, book) => sum + book.chapters, 0);

const BibleReadingApp: React.FC = () => {
  const [sessions, setSessions] = useState<ReadingSession[]>([]);
  const [currentSession, setCurrentSession] = useState<ReadingSession | null>(null);
  const [expandedBook, setExpandedBook] = useState<number | null>(null);
  const [showNewSessionModal, setShowNewSessionModal] = useState<boolean>(false);
  const [newSessionName, setNewSessionName] = useState<string>('');
  const [editingSession, setEditingSession] = useState<ReadingSession | null>(null);
  const [showEditModal, setShowEditModal] = useState<boolean>(false);
  const [editSessionName, setEditSessionName] = useState<string>('');
  const [editStartDate, setEditStartDate] = useState<string>('');
  const [newStartDate, setNewStartDate] = useState<string>('');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [hideCompleted, setHideCompleted] = useState<boolean>(false);

  // Load sessions from storage on app start
  useEffect(() => {
    loadSessions();
  }, []);

  // Handle Android back button
  useEffect(() => {
    const backHandler = BackHandler.addEventListener('hardwareBackPress', () => {
      if (expandedBook !== null) {
        // If viewing chapters, go back to books list
        setExpandedBook(null);
        return true;
      } else if (currentSession !== null) {
        // If viewing books list, go back to sessions list
        setCurrentSession(null);
        setSearchQuery('');
        setHideCompleted(false); 
        return true;
      }
      // If at sessions list, allow default behavior (exit app)
      return false;
    });

    return () => backHandler.remove();
  }, [currentSession, expandedBook]);

  const loadSessions = async (): Promise<void> => {
    try {
      const storedSessions = await AsyncStorage.getItem('bible_sessions');
      if (storedSessions) {
        setSessions(JSON.parse(storedSessions));
      }
    } catch (error) {
      console.error('Error loading sessions:', error);
    }
  };

  const saveSessions = async (updatedSessions: ReadingSession[]): Promise<void> => {
    try {
      await AsyncStorage.setItem('bible_sessions', JSON.stringify(updatedSessions));
      setSessions(updatedSessions);
    } catch (error) {
      console.error('Error saving sessions:', error);
    }
  };

  const createNewSession = (): void => {
    if (newSessionName.trim() === '') {
      Alert.alert('Error', 'Please enter a session name');
      return;
    }

    if (newStartDate.trim() === '') {
      Alert.alert('Error', 'Please enter a date');
      return;
    }

    const newSession: ReadingSession = {
      id: Date.now().toString(),
      name: newSessionName.trim(),
      completedChapters: {},
      createdAt: new Date().toISOString(),
      startDate: newStartDate.trim(),
    };

    const updatedSessions = [...sessions, newSession];
    saveSessions(updatedSessions);
    setNewSessionName('');
    setNewStartDate('');
    setShowNewSessionModal(false);
  };

 const applyEditSession = (): void => {
  if (!editingSession) return;

  const updatedSessions = sessions.map(session => 
    session.id === editingSession.id 
      ? { ...session, name: editSessionName.trim(), startDate: editStartDate.trim() }
      : session
  );
  
  saveSessions(updatedSessions);
  
  if (currentSession?.id === editingSession.id) {
    setCurrentSession({ ...currentSession, name: editSessionName.trim(), startDate: editStartDate.trim() });
  }
  
  setShowEditModal(false);
  setEditingSession(null);
  setEditSessionName('');
  setEditStartDate('');
};

const editSession = (): void => {
  if (!editingSession || editSessionName.trim() === '') {
    Alert.alert('Error', 'Please enter a session name');
    return;
  }

  if (editStartDate.trim() === '') {
    Alert.alert('Error', 'Please enter a start date');
    return;
  }

  const nameChanged = editSessionName.trim() !== editingSession.name;
  const dateChanged = editStartDate.trim() !== (editingSession.startDate || '');

  if (nameChanged || dateChanged) {
    Alert.alert(
      'Save Changes',
      'Are you sure you want to save these changes?',
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Save', onPress: applyEditSession },
      ]
    );
  } else {
    setShowEditModal(false);
    setEditingSession(null);
    setEditSessionName('');
    setEditStartDate('');
  }
};

  const openEditModal = (session: ReadingSession): void => {
    setEditingSession(session);
    setEditSessionName(session.name);
    setEditStartDate(session.startDate || '');
    setShowEditModal(true);
  };

  const deleteSession = (sessionId: string): void => {
    Alert.alert(
      'Delete Session',
      'Are you sure you want to delete this reading session?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: () => {
            const updatedSessions = sessions.filter(s => s.id !== sessionId);
            saveSessions(updatedSessions);
            if (currentSession && currentSession.id === sessionId) {
              setCurrentSession(null);
            }
          },
        },
      ]
    );
  };

  const toggleAllChaptersInBook = (bookIndex: number, checkAll: boolean): void => {
    if (!currentSession) return;

    const book = BIBLE_BOOKS[bookIndex];
    const updatedSession: ReadingSession = { ...currentSession };
    
    for (let i = 1; i <= book.chapters; i++) {
      const key = `${bookIndex}-${i}`;
      if (checkAll) {
        updatedSession.completedChapters[key] = true;
      } else {
        delete updatedSession.completedChapters[key];
      }
    }

    setCurrentSession(updatedSession);
    
    // Update in sessions array and save
    const updatedSessions = sessions.map(s => 
      s.id === updatedSession.id ? updatedSession : s
    );
    saveSessions(updatedSessions);
  };

  const toggleChapter = (bookIndex: number, chapterNumber: number): void => {
    if (!currentSession) return;

    const key = `${bookIndex}-${chapterNumber}`;
    const updatedSession: ReadingSession = { ...currentSession };
    
    if (updatedSession.completedChapters[key]) {
      delete updatedSession.completedChapters[key];
    } else {
      updatedSession.completedChapters[key] = true;
    }

    setCurrentSession(updatedSession);
    
    // Update in sessions array and save
    const updatedSessions = sessions.map(s => 
      s.id === updatedSession.id ? updatedSession : s
    );
    saveSessions(updatedSessions);
  };

  const toggleHideCompleted = (): void => {
    if (!currentSession) return;

    const newHideCompleted = !hideCompleted;
    setHideCompleted(newHideCompleted);

    // Save the preference to the session
    const updatedSession: ReadingSession = { 
      ...currentSession, 
      hideCompletedBooks: newHideCompleted 
    };
    setCurrentSession(updatedSession);

    const updatedSessions = sessions.map(s => 
      s.id === updatedSession.id ? updatedSession : s
    );
    saveSessions(updatedSessions);
  };

  const getCompletedChaptersCount = (session: ReadingSession | null = currentSession): number => {
    return Object.keys(session?.completedChapters || {}).length;
  };

  const getBookProgress = (bookIndex: number, session: ReadingSession | null = currentSession): BookProgress => {
    const book = BIBLE_BOOKS[bookIndex];
    let completed = 0;
    
    for (let i = 1; i <= book.chapters; i++) {
      const key = `${bookIndex}-${i}`;
      if (session?.completedChapters[key]) {
        completed++;
      }
    }
    
    return { completed, total: book.chapters };
  };

  const getCompletedBooksCount = (session: ReadingSession | null = currentSession): number => {
    let completedBooks = 0;
    for (let i = 0; i < BIBLE_BOOKS.length; i++) {
      const { completed, total } = getBookProgress(i, session);
      if (completed === total) {
        completedBooks++;
      }
    }
    return completedBooks;
  };

  const formatDate = (isoString: string): string => {
    const date = new Date(isoString);
    return date.toLocaleDateString('en-US', { 
      year: 'numeric', 
      month: 'short', 
      day: 'numeric' 
    });
  };

  const getFilteredBooks = (): Array<{ book: BibleBook; index: number }> => {
    let filtered = BIBLE_BOOKS.map((book, index) => ({ book, index }));

    // Apply search filter
    if (searchQuery.trim() !== '') {
      filtered = filtered.filter(({ book }) =>
        book.name.toLowerCase().includes(searchQuery.toLowerCase())
      );
    }

    // Apply completed filter
    if (hideCompleted) {
      filtered = filtered.filter(({ index }) => {
        const { completed, total } = getBookProgress(index);
        return completed !== total;
      });
    }

    return filtered;
  };

  const BookProgressBar: React.FC<{ bookIndex: number }> = ({ bookIndex }) => {
    const { completed, total } = getBookProgress(bookIndex);
    const progress = completed / total;
    
    return (
      <View style={styles.bookProgressContainer}>
        <View style={styles.bookProgressTrack}>
          <View 
            style={[styles.bookProgressFill, { width: `${progress * 100}%` }]} 
          />
        </View>
      </View>
    );
  };

  const BooksCompletionGrid: React.FC<{ session: ReadingSession }> = ({ session }) => {
    return (
      <View style={styles.booksGridContainer}>
        <View style={styles.booksGrid}>
          {BIBLE_BOOKS.map((book, index) => {
            const { completed, total } = getBookProgress(index, session);
            const isCompleted = completed === total;
            const isInProgress = completed > 0 && completed < total;
            const isMidpoint = index === 39; // 40th book (Matthew) - index starts at 0
            
            return (
              <View
                key={index}
                style={[
                  styles.gridCell,
                  isCompleted && styles.gridCellCompleted,
                  isInProgress && styles.gridCellInProgress
                ]}
              >
                {isMidpoint && (
                  <Text style={[
                    styles.gridCellText, 
                    isCompleted && styles.gridCellTextCompleted,
                    isInProgress && styles.gridCellTextInProgress
                  ]}>NT</Text>
                )}
              </View>
            );
          })}
        </View>
        <Text style={styles.booksCompletedText}>
          {getCompletedBooksCount(session)} / 66 books completed
        </Text>
      </View>
    );
  };

  const ProgressBar: React.FC = () => {
    const completedChapters = getCompletedChaptersCount();
    const progress = completedChapters / TOTAL_CHAPTERS;
    
    return (
      <View style={styles.progressBarContainer}>
        <Text style={styles.progressText}>
          {completedChapters} / {TOTAL_CHAPTERS} chapters
        </Text>
        <View style={styles.progressBarTrack}>
          <View 
            style={[styles.progressBarFill, { width: `${progress * 100}%` }]} 
          />
        </View>
        <Text style={styles.progressPercentage}>
          {Math.round(progress * 100)}%
        </Text>
      </View>
    );
  };

  // Sessions List Screen
  if (!currentSession) {
    return (
      <View style={styles.container}>
        <StatusBar 
          barStyle="dark-content" 
          backgroundColor="#fff"
          translucent={false}
        />
        <SafeAreaView style={styles.safeArea}>
        <ScrollView style={styles.sessionsList}>
          {sessions.length === 0 && (
            <View style={styles.emptySessionsContainer}>
              <Text style={styles.emptySessionsTitle}>Welcome to BibleFin!</Text>
              <Text style={styles.emptySessionsText}>
                Create a new reading session to begin tracking your progress through the Bible.
              </Text>
            </View>
          )}
          {sessions.map((session) => {
            const completedChapters = getCompletedChaptersCount(session);
            const progress = completedChapters / TOTAL_CHAPTERS;
            
            return (
              <TouchableOpacity
                key={session.id}
                style={styles.sessionCard}
                onPress={() => {
  setHideCompleted(session.hideCompletedBooks || false);
  setCurrentSession(session);
}}
              >
                <View style={styles.sessionCardHeader}>
                  <Text style={styles.sessionName}>{session.name}</Text>
                  <View style={styles.sessionActions}>
                    <TouchableOpacity
                      onPress={() => openEditModal(session)}
                      style={styles.editButton}
                    >
                      <Text style={styles.editButtonText}>✎</Text>
                    </TouchableOpacity>
                  </View>
                </View>
                
                <Text style={styles.sessionDate}>
                  Date: {session.startDate || formatDate(session.createdAt)}
                </Text>

                <BooksCompletionGrid session={session} />
                
                <Text style={styles.sessionProgress}>
                  {completedChapters} / {TOTAL_CHAPTERS} chapters ({Math.round(progress * 100)}%)
                </Text>
                
                <View style={styles.smallProgressTrack}>
                  <View 
                    style={[styles.smallProgressFill, { width: `${progress * 100}%` }]} 
                  />
                </View>
              </TouchableOpacity>
            );
          })}
        </ScrollView>

        <TouchableOpacity
          style={styles.addButton}
          onPress={() => setShowNewSessionModal(true)}
        >
          <Text style={styles.addButtonText}>+ New Reading Session</Text>
        </TouchableOpacity>

        <Modal
          visible={showNewSessionModal}
          transparent={true}
          animationType="slide"
        >
          <KeyboardAvoidingView 
            style={styles.modalOverlay} 
            behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          >
            <View style={styles.modalContent}>
              <Text style={styles.modalTitle}>Create New Session</Text>
              
              <TextInput
                style={styles.textInput}
                placeholder="Enter session name"
                value={newSessionName}
                onChangeText={setNewSessionName}
                autoFocus={true}
              />

              <TextInput
                style={styles.textInput}
                placeholder="Date"
                value={newStartDate}
                onChangeText={setNewStartDate}
              />
              
              <View style={styles.modalButtons}>
                <TouchableOpacity
                  style={[styles.modalButton, styles.cancelButton]}
                  onPress={() => {
                    setShowNewSessionModal(false);
                    setNewSessionName('');
                    setNewStartDate('');
                  }}
                >
                  <Text style={styles.cancelButtonText}>Cancel</Text>
                </TouchableOpacity>
                
                <TouchableOpacity
                  style={[styles.modalButton, styles.createButton]}
                  onPress={createNewSession}
                >
                  <Text style={styles.createButtonText}>Create</Text>
                </TouchableOpacity>
              </View>
            </View>
          </KeyboardAvoidingView>
        </Modal>
        <Modal
          visible={showEditModal}
          transparent={true}
          animationType="slide"
        >
          <KeyboardAvoidingView 
            style={styles.modalOverlay} 
            behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          >
            <View style={styles.modalContent}>
              <Text style={styles.modalTitle}>Edit Session</Text>
              
              <TextInput
                style={styles.textInput}
                placeholder="Enter session name"
                value={editSessionName}
                onChangeText={setEditSessionName}
                autoFocus={true}
              />

              <TextInput
                style={styles.textInput}
                placeholder="Date"
                value={editStartDate}
                onChangeText={setEditStartDate}
              />
              
              <View style={styles.modalButtons}>
                <TouchableOpacity
                  style={[styles.modalButton, styles.cancelButton]}
                  onPress={() => {
                    setShowEditModal(false);
                    setEditingSession(null);
                    setEditSessionName('');
                    setEditStartDate('');
                  }}
                >
                  <Text style={styles.cancelButtonText}>Cancel</Text>
                </TouchableOpacity>
                
                <TouchableOpacity
                  style={[styles.modalButton, styles.createButton]}
                  onPress={editSession}
                >
                  <Text style={styles.createButtonText}>Save</Text>
                </TouchableOpacity>
              </View>
            </View>
          </KeyboardAvoidingView>
        </Modal>
        </SafeAreaView>
      </View>
    );
  }

  // Books List Screen
  if (expandedBook === null) {
    const filteredBooks = getFilteredBooks();

    return (
      <View style={styles.container}>
        <StatusBar 
          barStyle="dark-content" 
          backgroundColor="#fff"
          translucent={false}
        />
        <SafeAreaView style={styles.safeArea}>
        <View style={styles.header}>
          <TouchableOpacity
            onPress={() => {
              setCurrentSession(null);
              setSearchQuery('');
              setHideCompleted(false);
            }}
            style={styles.backButton}
          >
            <Text style={styles.backButtonText}>← Back</Text>
          </TouchableOpacity>
          <Text style={styles.headerTitle}>{currentSession.name}</Text>
          <TouchableOpacity
            onPress={() => deleteSession(currentSession.id)}
          >
            <Text style={styles.headerDeleteButtonText}>Delete Session</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.sessionBooksGridHeader}>
          <BooksCompletionGrid session={currentSession} />
        </View>

        <View style={styles.searchFilterContainer}>
          <View style={styles.searchContainer}>
            <Text style={styles.searchIcon}>🔍</Text>
            <TextInput
              style={styles.searchInput}
              placeholder="Search books..."
              value={searchQuery}
              onChangeText={setSearchQuery}
              placeholderTextColor="#999"
            />
            {searchQuery.length > 0 && (
              <TouchableOpacity
                onPress={() => setSearchQuery('')}
                style={styles.clearButton}
              >
                <Text style={styles.clearButtonText}>×</Text>
              </TouchableOpacity>
            )}
          </View>

          <TouchableOpacity
            style={styles.filterCheckbox}
            onPress={toggleHideCompleted}
          >
            <View style={[styles.checkbox, hideCompleted && styles.checkboxChecked]}>
              {hideCompleted && <Text style={styles.checkmark}>✓</Text>}
            </View>
            <Text style={styles.filterLabel}>Hide Completed Books</Text>
          </TouchableOpacity>
        </View>
        
        <ScrollView style={styles.booksList}>
          {filteredBooks.length === 0 ? (
            <View style={styles.emptyState}>
              <Text style={styles.emptyStateText}>
                {searchQuery ? 'No books found' : 'All books completed! 🎉'}
              </Text>
            </View>
          ) : (
            filteredBooks.map(({ book, index }) => {
              const { completed, total } = getBookProgress(index);
              const isCompleted = completed === total;
              const isInProgress = completed > 0 && completed < total;
              const allCompleted = completed === total;
              const noneCompleted = completed === 0;
              
              return (
                <View key={index} style={styles.bookContainer}>
                  <TouchableOpacity
                    style={[
                      styles.bookCard, 
                      isCompleted && styles.completedBookCard,
                      isInProgress && styles.inProgressBookCard
                    ]}
                    onPress={() => setExpandedBook(index)}
                  >
                    <View style={styles.bookCardContent}>
                      <View style={styles.bookNameContainer}>
                        <Text style={styles.bookNumber}>{index + 1}.</Text>
                        <Text style={[
                          styles.bookName, 
                          isCompleted && styles.completedBookName,
                          isInProgress && styles.inProgressBookName
                        ]}>
                          {book.name}
                        </Text>
                      </View>
                      <Text style={styles.bookProgress}>
                        {completed} / {total} chapters{isCompleted ? ' ✓' : ''}
                      </Text>
                      <BookProgressBar bookIndex={index} />
                    </View>
                    <Text style={styles.chevron}>›</Text>
                  </TouchableOpacity>
                  
                  <View style={styles.bookActions}>
                    <TouchableOpacity
                      style={[styles.actionButton, noneCompleted && styles.disabledButton]}
                      onPress={() => !noneCompleted && toggleAllChaptersInBook(index, false)}
                      disabled={noneCompleted}
                    >
                      <Text style={[styles.actionButtonText, noneCompleted && styles.disabledButtonText]}>
                        Uncheck All
                      </Text>
                    </TouchableOpacity>
                    
                    <TouchableOpacity
                      style={[styles.actionButton, allCompleted && styles.disabledButton]}
                      onPress={() => !allCompleted && toggleAllChaptersInBook(index, true)}
                      disabled={allCompleted}
                    >
                      <Text style={[styles.actionButtonText, allCompleted && styles.disabledButtonText]}>
                        Check All
                      </Text>
                    </TouchableOpacity>
                  </View>
                </View>
              );
            })
          )}
        </ScrollView>

        <ProgressBar />
        </SafeAreaView>
      </View>
    );
  }

  // Chapters Screen
  const currentBook = BIBLE_BOOKS[expandedBook];
  const { completed: bookCompleted, total: bookTotal } = getBookProgress(expandedBook);
  const allCompleted = bookCompleted === bookTotal;
  const noneCompleted = bookCompleted === 0;
  
  return (
    <View style={styles.container}>
      <StatusBar 
        barStyle="dark-content" 
        backgroundColor="#fff"
        translucent={false}
      />
      <SafeAreaView style={styles.safeArea}>
      <View style={styles.header}>
        <TouchableOpacity
          onPress={() => setExpandedBook(null)}
          style={styles.backButton}
        >
          <Text style={styles.backButtonText}>← Back</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>{currentBook.name}</Text>
      </View>
      
      <View style={styles.chapterActions}>
        <TouchableOpacity
          style={[styles.chapterActionButton, noneCompleted && styles.disabledButton]}
          onPress={() => !noneCompleted && toggleAllChaptersInBook(expandedBook, false)}
          disabled={noneCompleted}
        >
          <Text style={[styles.chapterActionButtonText, noneCompleted && styles.disabledButtonText]}>
            Uncheck All
          </Text>
        </TouchableOpacity>
        
        <Text style={styles.chapterProgress}>
          {bookCompleted} / {bookTotal} chapters{allCompleted ? ' ✓' : ''}
        </Text>
        
        <TouchableOpacity
          style={[styles.chapterActionButton, allCompleted && styles.disabledButton]}
          onPress={() => !allCompleted && toggleAllChaptersInBook(expandedBook, true)}
          disabled={allCompleted}
        >
          <Text style={[styles.chapterActionButtonText, allCompleted && styles.disabledButtonText]}>
            Check All
          </Text>
        </TouchableOpacity>
      </View>
      
      <ScrollView style={styles.chaptersList}>
        <View style={styles.chaptersGrid}>
          {Array.from({ length: currentBook.chapters }, (_, index) => {
            const chapterNumber = index + 1;
            const key = `${expandedBook}-${chapterNumber}`;
            const isCompleted = currentSession.completedChapters[key];
            
            return (
              <TouchableOpacity
                key={chapterNumber}
                style={[styles.chapterButton, isCompleted && styles.completedChapter]}
                onPress={() => toggleChapter(expandedBook, chapterNumber)}
              >
                <Text 
                  style={[
                    styles.chapterNumber, 
                    isCompleted && styles.completedChapterNumber
                  ]}
                >
                  {chapterNumber}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>
      </ScrollView>

      <ProgressBar />
      </SafeAreaView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  safeArea: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  headerDeleteButtonText: {
    fontSize: 16,
    color: '#007AFF',
  },
  backButton: {
    marginRight: 16,
  },
  backButtonText: {
    fontSize: 16,
    color: '#007AFF',
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    flex: 1,
    marginRight: 8,
  },
  sessionsList: {
    flex: 1,
    padding: 16,
  },
  sessionCard: {
    backgroundColor: '#fff',
    padding: 16,
    borderRadius: 8,
    marginBottom: 12,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  sessionCardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  sessionName: {
    fontSize: 18,
    fontWeight: 'bold',
    flex: 1,
  },
  sessionActions: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  editButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#4CAF50',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 8,
  },
  editButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  sessionDate: {
    fontSize: 12,
    color: '#999',
    marginBottom: 8,
  },
  deleteButton: {
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: '#ff4444',
    justifyContent: 'center',
    alignItems: 'center',
  },
  deleteButtonText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold',
  },
  sessionProgress: {
    fontSize: 14,
    color: '#666',
    marginBottom: 8,
  },
  smallProgressTrack: {
    height: 4,
    backgroundColor: '#e0e0e0',
    borderRadius: 2,
    overflow: 'hidden',
  },
  smallProgressFill: {
    height: '100%',
    backgroundColor: '#4CAF50',
  },
  addButton: {
    backgroundColor: '#007AFF',
    margin: 16,
    padding: 16,
    borderRadius: 8,
    alignItems: 'center',
  },
  addButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  booksGridContainer: {
    marginTop: 12,
    marginBottom: 8,
  },
  booksGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginBottom: 8,
  },
  gridCell: {
    width: 12,
    height: 12,
    backgroundColor: '#e0e0e0',
    borderRadius: 2,
    marginRight: 3,
    marginBottom: 3,
    justifyContent: 'center',
    alignItems: 'center',
  },
  gridCellCompleted: {
    backgroundColor: '#4CAF50',
  },
  gridCellInProgress: {
    backgroundColor: '#FFC107',
  },
  gridCellText: {
    fontSize: 6,
    fontWeight: 'bold',
    color: '#333',
  },
  gridCellTextCompleted: {
    color: '#fff',
  },
  gridCellTextInProgress: {
    color: '#333',
  },
  booksCompletedText: {
    fontSize: 12,
    color: '#666',
    fontWeight: '600',
  },
  sessionBooksGridHeader: {
    backgroundColor: '#fff',
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  searchFilterContainer: {
    backgroundColor: '#fff',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f5f5f5',
    borderRadius: 8,
    paddingHorizontal: 12,
    marginBottom: 12,
  },
  searchIcon: {
    fontSize: 16,
    marginRight: 8,
  },
  searchInput: {
    flex: 1,
    paddingVertical: 10,
    fontSize: 16,
    color: '#333',
  },
  clearButton: {
    padding: 4,
  },
  clearButtonText: {
    fontSize: 20,
    color: '#999',
    fontWeight: 'bold',
  },
  filterButton: {
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#007AFF',
    alignItems: 'center',
  },
  filterButtonActive: {
    backgroundColor: '#007AFF',
  },
  filterButtonText: {
    color: '#007AFF',
    fontSize: 14,
    fontWeight: 'bold',
  },
  filterButtonTextActive: {
    color: '#fff',
  },
  filterCheckbox: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
  },
  checkbox: {
    width: 24,
    height: 24,
    borderRadius: 4,
    borderWidth: 2,
    borderColor: '#007AFF',
    marginRight: 10,
    justifyContent: 'center',
    alignItems: 'center',
  },
  checkboxChecked: {
    backgroundColor: '#007AFF',
  },
  checkmark: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  filterLabel: {
    fontSize: 16,
    color: '#333',
  },
  emptyState: {
    padding: 40,
    alignItems: 'center',
  },
  emptyStateText: {
    fontSize: 16,
    color: '#999',
    textAlign: 'center',
  },
  booksList: {
    flex: 1,
    padding: 16,
  },
  bookContainer: {
    marginBottom: 8,
  },
  bookCard: {
    backgroundColor: '#fff',
    padding: 16,
    borderRadius: 8,
    marginBottom: 8,
    flexDirection: 'row',
    alignItems: 'center',
    elevation: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
  },
  completedBookCard: {
    backgroundColor: '#e8f5e8',
  },
  inProgressBookCard: {
    backgroundColor: '#fff9c4',
  },
  bookCardContent: {
    flex: 1,
  },
  bookNameContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  bookNumber: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#666',
    marginRight: 8,
    minWidth: 28,
  },
  bookName: {
    fontSize: 16,
    fontWeight: 'bold',
    flex: 1,
  },
  completedBookName: {
    color: '#4CAF50',
  },
  inProgressBookName: {
    color: '#FF8F00',
  },
  bookProgress: {
    fontSize: 14,
    color: '#666',
    marginBottom: 8,
  },
  bookProgressContainer: {
    marginTop: 4,
  },
  bookProgressTrack: {
    height: 4,
    backgroundColor: '#e0e0e0',
    borderRadius: 2,
    overflow: 'hidden',
  },
  bookProgressFill: {
    height: '100%',
    backgroundColor: '#4CAF50',
  },
  bookActions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 8,
    backgroundColor: '#f8f8f8',
    borderBottomLeftRadius: 8,
    borderBottomRightRadius: 8,
  },
  actionButton: {
    paddingHorizontal: 16,
    paddingVertical: 6,
    backgroundColor: '#007AFF',
    borderRadius: 16,
    minWidth: 80,
    alignItems: 'center',
  },
  actionButtonText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: 'bold',
  },
  disabledButton: {
    backgroundColor: '#ccc',
  },
  disabledButtonText: {
    color: '#888',
  },
  chevron: {
    fontSize: 20,
    color: '#ccc',
  },
  chaptersList: {
    flex: 1,
    padding: 16,
  },
  chapterActions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  chapterActionButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    backgroundColor: '#007AFF',
    borderRadius: 20,
    minWidth: 90,
    alignItems: 'center',
  },
  chapterActionButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: 'bold',
  },
  chapterProgress: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
  },
  chaptersGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  chapterButton: {
    width: '18%',
    aspectRatio: 1,
    backgroundColor: '#fff',
    borderRadius: 8,
    marginBottom: 12,
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
  },
  completedChapter: {
    backgroundColor: '#e8f5e8',
  },
  chapterNumber: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
  },
  completedChapterNumber: {
    color: '#4CAF50',
    textDecorationLine: 'line-through',
  },
  progressBarContainer: {
    backgroundColor: '#fff',
    padding: 16,
    borderTopWidth: 1,
    borderTopColor: '#e0e0e0',
  },
  progressText: {
    textAlign: 'center',
    fontSize: 14,
    color: '#666',
    marginBottom: 8,
  },
  progressBarTrack: {
    height: 12,
    backgroundColor: '#e0e0e0',
    borderRadius: 6,
    overflow: 'hidden',
    marginBottom: 8,
  },
  progressBarFill: {
    height: '100%',
    backgroundColor: '#4CAF50',
    borderRadius: 6,
  },
  progressPercentage: {
    textAlign: 'center',
    fontSize: 16,
    fontWeight: 'bold',
    color: '#4CAF50',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    backgroundColor: '#fff',
    padding: 20,
    borderRadius: 12,
    width: '80%',
    maxWidth: 300,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    textAlign: 'center',
    marginBottom: 16,
  },
  textInput: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    marginBottom: 20,
  },
  modalButtons: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  modalButton: {
    flex: 1,
    padding: 12,
    borderRadius: 8,
    alignItems: 'center',
  },
  cancelButton: {
    backgroundColor: '#f0f0f0',
    marginRight: 8,
  },
  createButton: {
    backgroundColor: '#007AFF',
    marginLeft: 8,
  },
  cancelButtonText: {
    color: '#333',
    fontWeight: 'bold',
  },
  createButtonText: {
    color: '#fff',
    fontWeight: 'bold',
  },
  emptySessionsContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 60,
    paddingHorizontal: 40,
  },
  emptySessionsTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#333',
    textAlign: 'center',
    marginBottom: 24,
  },
  emptySessionsText: {
    fontSize: 15,
    color: '#777',
    textAlign: 'center',
    lineHeight: 24,
  },
});

export default BibleReadingApp;